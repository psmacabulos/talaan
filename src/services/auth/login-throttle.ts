export type LoginThrottle = {
  /** True while this key is locked out. Checked before the password, so a locked account is refused even with the right one. */
  isLocked(key: string, now: number): boolean;
  /** Counts a wrong password (or, for sign-ups, an attempt). Returns true when this one locked the key. */
  recordFailure(key: string, now: number): boolean;
  /** A right password clears the count. */
  recordSuccess(key: string): void;
};

type Entry = { failures: number[]; lockedUntil: number | null };

/** Above this many keys, a failure also sweeps out entries that no longer matter, at most once a minute. */
const SWEEP_ABOVE = 1_000;
const SWEEP_EVERY_MS = 60_000;

/** The most keys one throttle remembers, so rotating addresses or emails can't grow it without end (Step 53.3). */
const MAX_KEYS = 10_000;

/**
 * `maxFailures` failures for one key within `windowMs` lock that key for
 * `windowMs`. Kept in the server's memory, like the live monitor's tap
 * channel: on one server that covers every request, and a restart clears
 * it, which is acceptable for a pilot (docs/AUTH.md).
 *
 * Bounded (Step 53.3): stale entries are swept at most once a minute, and at
 * `maxKeys` the oldest key that isn't locked makes room for a new one. A
 * live lockout is never dropped to make room; if every key is locked, a new
 * key just isn't counted until one frees up.
 */
export function createLoginThrottle(options: {
  maxFailures: number;
  windowMs: number;
  maxKeys?: number;
}): LoginThrottle {
  const { maxFailures, windowMs, maxKeys = MAX_KEYS } = options;
  const entries = new Map<string, Entry>();
  let lastSweep = -Infinity;

  function isLockedEntry(entry: Entry, now: number) {
    return entry.lockedUntil !== null && now < entry.lockedUntil;
  }

  function sweep(now: number) {
    lastSweep = now;
    for (const [key, entry] of entries) {
      const recent = entry.failures.some((at) => now - at < windowMs);
      if (!isLockedEntry(entry, now) && !recent) entries.delete(key);
    }
  }

  /** Frees one place for a new key: the oldest one that isn't locked. False when every key is locked. */
  function makeRoom(now: number): boolean {
    for (const [key, entry] of entries) {
      if (!isLockedEntry(entry, now)) {
        entries.delete(key);
        return true;
      }
    }
    return false;
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
      if (entries.size > SWEEP_ABOVE && now - lastSweep >= SWEEP_EVERY_MS) sweep(now);
      const existing = entries.get(key);
      if (!existing && entries.size >= maxKeys && !makeRoom(now)) return false;
      const entry = existing ?? { failures: [], lockedUntil: null };
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

const FIFTEEN_MINUTES = 15 * 60_000;
const ONE_HOUR = 60 * 60_000;
const ONE_DAY = 24 * ONE_HOUR;

/**
 * Each kind of count has its own throttle (Step 53.3), so one kind filling
 * up can never push another kind's lockouts out.
 */
export const staffSignInThrottle = createLoginThrottle({ maxFailures: 5, windowMs: FIFTEEN_MINUTES });

/** 5 wrong passwords for one parent email in 15 minutes. */
export const parentSignInThrottle = createLoginThrottle({ maxFailures: 5, windowMs: FIFTEEN_MINUTES });

/**
 * 30 wrong parent passwords from one address in 15 minutes, whatever the
 * emails: someone trying many emails. Loose on purpose, since many parents
 * can share one address (a school's Wi-Fi, a mobile carrier's NAT).
 */
export const parentAddressThrottle = createLoginThrottle({ maxFailures: 30, windowMs: FIFTEEN_MINUTES });

/**
 * 100 sign-ups from one address in an hour. Generous for a school's launch
 * night on one Wi-Fi, but it bounds the password hashing a stranger can make
 * the server do, and how fast "email taken" answers can be collected.
 */
export const parentSignUpThrottle = createLoginThrottle({ maxFailures: 100, windowMs: ONE_HOUR });

/**
 * 5 wrong "link a child" tries by one parent in 15 minutes (Step 55.1),
 * keyed by the parent's id. Kept in memory like the others, so a restart
 * clears it; the real guard is the per-child count in Postgres
 * (`src/services/parents/link-attempts.ts`), which a new account can't reset.
 */
export const parentLinkThrottle = createLoginThrottle({ maxFailures: 5, windowMs: FIFTEEN_MINUTES });

/** 3 "Forgot your password?" emails asked for one staff email in an hour (Step 55.5), keyed by `staffResetKey`. */
export const staffResetEmailThrottle = createLoginThrottle({ maxFailures: 3, windowMs: ONE_HOUR });

/** 20 reset requests from one network in an hour, whatever the emails (Step 55.5). */
export const resetAddressThrottle = createLoginThrottle({ maxFailures: 20, windowMs: ONE_HOUR });

/**
 * 80 emails a day from the whole app (Step 55.5), under Resend's free 100,
 * so someone cycling through many emails can't use up the day and leave
 * real resets failing. One key, `DAILY_EMAIL_KEY`, counts emails actually
 * sent. Like every count here, a restart clears it; the provider's own
 * daily limit still holds.
 */
export const dailyEmailCap = createLoginThrottle({ maxFailures: 80, windowMs: ONE_DAY });
export const DAILY_EMAIL_KEY = "all";

/** The throttle's key for a staff email. Parents use `parentThrottleKey`, so the two never share a count. */
export function staffThrottleKey(email: string): string {
  return `staff:${email.trim().toLowerCase()}`;
}

export function parentThrottleKey(email: string): string {
  return `parent:${email.trim().toLowerCase()}`;
}

/** "Forgot your password?"'s key for a staff email, never shared with the sign-in count. */
export function staffResetKey(email: string): string {
  return `staff-reset:${email.trim().toLowerCase()}`;
}
