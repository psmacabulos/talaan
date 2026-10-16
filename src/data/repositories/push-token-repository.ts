/** The two kinds of phone the parent app runs on (Step 53.4). */
export type PushPlatform = "ios" | "android";

/** What saving a push address did: saved, lost a race with another registration, or found its sign-in gone. */
export type ReplacePushTokenOutcome = "saved" | "clash" | "signed_out";

/** One signed-in phone's push address: its Expo push token. */
export type StoredPushToken = {
  token: string;
  platform: PushPlatform;
  parentTokenId: string;
};

export interface PushTokenRepository {
  /** The row holding this push address, under whichever sign-in. */
  findByToken(token: string): Promise<StoredPushToken | null>;
  /**
   * Saves the push address for this sign-in, in one write: first removes
   * this sign-in's old address, and this address under any other sign-in.
   * "clash" when another request wrote one of them at the same moment, and
   * "signed_out" when the sign-in was deleted a moment ago.
   */
  replace(pushToken: StoredPushToken & { id: string }): Promise<ReplacePushTokenOutcome>;
  /** Removes a signed-out phone's push address. */
  deleteForParentToken(parentTokenId: string): Promise<void>;
}

/** In memory, for tests. */
export function createMockPushTokenRepository(): PushTokenRepository & {
  rows: (StoredPushToken & { id: string })[];
} {
  const rows: (StoredPushToken & { id: string })[] = [];
  const removeWhere = (matches: (row: StoredPushToken) => boolean) => {
    for (let index = rows.length - 1; index >= 0; index--) if (matches(rows[index])) rows.splice(index, 1);
  };
  return {
    rows,
    async findByToken(token) {
      const row = rows.find((candidate) => candidate.token === token);
      return row ? { token: row.token, platform: row.platform, parentTokenId: row.parentTokenId } : null;
    },
    async replace(pushToken) {
      removeWhere((row) => row.token === pushToken.token || row.parentTokenId === pushToken.parentTokenId);
      rows.push({ ...pushToken });
      return "saved";
    },
    async deleteForParentToken(parentTokenId) {
      removeWhere((row) => row.parentTokenId === parentTokenId);
    },
  };
}
