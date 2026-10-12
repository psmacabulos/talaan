export type LoginThrottle = {
  /** True while this key is locked out. Checked before the password, so a locked account is refused even with the right one. */
  isLocked(key: string, now: number): boolean;
  /** Counts a wrong password. Returns true when this failure locked the key. */
  recordFailure(key: string, now: number): boolean;
  /** A right password clears the count. */
  recordSuccess(key: string): void;
};

type Entry = { failures: number[]; lockedUntil: number | null };

/** Above this many keys, a failure also sweeps out entries that no longer matter. */
const SWEEP_ABOVE = 1_000;

/**
 * `maxFailures` wrong passwords for one key within `windowMs` lock that key
 * for `windowMs`. Kept in the server's memory, like the live monitor's tap
 * channel: on one server that covers every request, and a restart clears
 * it, which is acceptable for a pilot (docs/AUTH.md).
 */
export function createLoginThrottle(options: { maxFailures: number; windowMs: number }): LoginThrottle {
  const { maxFailures, windowMs } = options;
  const entries = new Map<string, Entry>();

  function sweep(now: number) {
    for (const [key, entry] of entries) {
      const locked = entry.lockedUntil !== null && now < entry.lockedUntil;
      const recent = entry.failures.some((at) => now - at < windowMs);
      if (!locked && !recent) entries.delete(key);
    }
  }

  return {
    isLocked(key, now) {
      const entry = entries.get(key);
      if (!entry || entry.lockedUntil === null) return false;
      if (now < entry.lockedUntil) return true;
      entries.delete(key);
      return false;
    },
    recordFailure(key, now) {
      if (entries.size > SWEEP_ABOVE) sweep(now);
      const entry = entries.get(key) ?? { failures: [], lockedUntil: null };
      entry.failures = [...entry.failures.filter((at) => now - at < windowMs), now];
      const locked = entry.failures.length >= maxFailures;
      if (locked) {
        entry.lockedUntil = now + windowMs;
        entry.failures = [];
      }
      entries.set(key, entry);
      return locked;
    },
    recordSuccess(key) {
      entries.delete(key);
    },
  };
}

/** 5 wrong passwords in 15 minutes lock that email for 15 minutes (owner decision, 2026-10-12). */
export const loginThrottle = createLoginThrottle({ maxFailures: 5, windowMs: 15 * 60_000 });

/** The throttle's key for a staff email. Parents use `parentThrottleKey`, so the two never share a count. */
export function staffThrottleKey(email: string): string {
  return `staff:${email.trim().toLowerCase()}`;
}

export function parentThrottleKey(email: string): string {
  return `parent:${email.trim().toLowerCase()}`;
}
