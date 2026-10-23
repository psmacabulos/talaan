/** One "forgot your password" code (Step 55.6). Never the code itself: only its HMAC. */
export type StoredParentReset = {
  id: string;
  parentId: string;
  codeHash: string;
  expiresAt: string;
  tries: number;
  usedAt: string | null;
  createdAt: string;
};

/**
 * Parents' reset codes. Kept in Postgres, not memory, so the 5-codes-a-day
 * and 5-tries-a-code limits survive a restart (Heroku restarts daily).
 */
export interface ParentPasswordResetRepository {
  /** How many codes this parent was sent since `since`. Deletes their older rows first. */
  countRecent(parentId: string, since: string): Promise<number>;
  create(row: { id: string; parentId: string; codeHash: string; expiresAt: string }, now: string): Promise<void>;
  /** The parent's newest code since `since`, or null. Never an older one: asking again makes the old code useless. */
  newest(parentId: string, since: string): Promise<StoredParentReset | null>;
  /**
   * Adds 1 to `tries` in one statement, only while the code is unused,
   * unexpired and under `maxTries`. False when the code is dead. Spent
   * before the code is compared, so guesses sent at the same moment can't
   * each be checked against it.
   */
  spendTry(id: string, now: string, maxTries: number): Promise<boolean>;
  /**
   * One transaction: marks the code used (exactly one row, or nothing
   * changes), stores the new hash, deletes every sign-in of the parent
   * (their push addresses and pending pushes go with them) and every reset
   * row. False when another request used the code first.
   */
  complete(id: string, parentId: string, passwordHash: string, now: string): Promise<boolean>;
}

/** In memory, for tests. `onComplete` stands in for the parent's password and sign-ins. */
export function createMockParentPasswordResetRepository(
  options: { onComplete?: (parentId: string, passwordHash: string) => Promise<void> } = {},
): ParentPasswordResetRepository & { rows: StoredParentReset[] } {
  const rows: StoredParentReset[] = [];
  const removeWhere = (match: (row: StoredParentReset) => boolean) => {
    for (let index = rows.length - 1; index >= 0; index--) if (match(rows[index])) rows.splice(index, 1);
  };
  return {
    rows,
    async countRecent(parentId, since) {
      removeWhere((row) => row.parentId === parentId && Date.parse(row.createdAt) < Date.parse(since));
      return rows.filter((row) => row.parentId === parentId).length;
    },
    async create(row, now) {
      rows.push({ ...row, tries: 0, usedAt: null, createdAt: now });
    },
    async newest(parentId, since) {
      const recent = rows.filter((row) => row.parentId === parentId && Date.parse(row.createdAt) >= Date.parse(since));
      return recent.reduce<StoredParentReset | null>(
        (latest, row) => (!latest || Date.parse(row.createdAt) >= Date.parse(latest.createdAt) ? row : latest),
        null,
      );
    },
    async spendTry(id, now, maxTries) {
      const row = rows.find((candidate) => candidate.id === id);
      if (!row || row.usedAt || Date.parse(row.expiresAt) <= Date.parse(now) || row.tries >= maxTries) return false;
      row.tries += 1;
      return true;
    },
    async complete(id, parentId, passwordHash, now) {
      const row = rows.find((candidate) => candidate.id === id && candidate.parentId === parentId);
      if (!row || row.usedAt) return false;
      row.usedAt = now;
      await options.onComplete?.(parentId, passwordHash);
      removeWhere((candidate) => candidate.parentId === parentId);
      return true;
    },
  };
}
