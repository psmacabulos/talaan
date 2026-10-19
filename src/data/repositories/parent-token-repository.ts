/** One signed-in phone (Step 53.3). Never the token itself: only the service ever sees that, once. */
export type StoredParentToken = {
  id: string;
  parentId: string;
  lastUsedAt: string;
  revokedAt: string | null;
};

export interface ParentTokenRepository {
  /** Stores a new token by its hash, first used `now`. */
  create(token: { id: string; parentId: string; label: string | null }, tokenHash: string, now: string): Promise<void>;
  /** The token with this hash, revoked or not; the caller decides. */
  findByHash(tokenHash: string): Promise<StoredParentToken | null>;
  /** Moves `lastUsedAt` to `now`, only if it's older than `olderThan`, so requests at the same moment write once. */
  touch(id: string, now: string, olderThan: string): Promise<void>;
  /** Signs that one phone out. */
  revoke(id: string, now: string): Promise<void>;
  /**
   * Removes a parent's revoked tokens, and those unused since `usedBefore`
   * that have no push address, so old sign-ins don't pile up. A phone that
   * only reads the banners keeps its sign-in, and its pushes (Step 54).
   */
  deleteStale(parentId: string, usedBefore: string): Promise<void>;
}

/** In memory, for tests. */
export function createMockParentTokenRepository(
  /** The ids of the sign-ins that have a push address, like `PushToken.parentTokenId`. */
  withPushAddress: Set<string> = new Set(),
): ParentTokenRepository & {
  rows: (StoredParentToken & { tokenHash: string })[];
} {
  const rows: (StoredParentToken & { tokenHash: string })[] = [];
  return {
    rows,
    async create(token, tokenHash, now) {
      rows.push({ id: token.id, parentId: token.parentId, tokenHash, lastUsedAt: now, revokedAt: null });
    },
    async findByHash(tokenHash) {
      const row = rows.find((candidate) => candidate.tokenHash === tokenHash);
      return row ? { id: row.id, parentId: row.parentId, lastUsedAt: row.lastUsedAt, revokedAt: row.revokedAt } : null;
    },
    async touch(id, now, olderThan) {
      const row = rows.find((candidate) => candidate.id === id);
      if (row && Date.parse(row.lastUsedAt) < Date.parse(olderThan)) row.lastUsedAt = now;
    },
    async revoke(id, now) {
      const row = rows.find((candidate) => candidate.id === id);
      if (row && !row.revokedAt) row.revokedAt = now;
    },
    async deleteStale(parentId, usedBefore) {
      for (let index = rows.length - 1; index >= 0; index--) {
        const row = rows[index];
        const unused = Date.parse(row.lastUsedAt) < Date.parse(usedBefore) && !withPushAddress.has(row.id);
        const stale = row.revokedAt !== null || unused;
        if (row.parentId === parentId && stale) rows.splice(index, 1);
      }
    },
  };
}
