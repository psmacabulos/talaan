const MINUTE_MS = 60_000;
/** A gate clock this far ahead of the server is wrong, not early. */
const MAX_AHEAD_MS = 5 * MINUTE_MS;
/** Longer than a weekend offline; anything older is a wrong clock, not a queued tap. */
const MAX_BEHIND_MS = 7 * 24 * 60 * MINUTE_MS;

/**
 * The time a tap is stored with: the gate's own clock, so a tap queued
 * while offline keeps the time it really happened, unless that time can't
 * be right (more than 5 minutes in the future, or more than 7 days old, by
 * the server's clock). Then the tablet's clock is wrong, and the moment the
 * server received the tap is the best answer there is.
 */
export function chooseTapTime(clientTappedAt: string, receivedAt: string): string {
  const client = Date.parse(clientTappedAt);
  const received = Date.parse(receivedAt);
  if (Number.isNaN(client)) return new Date(received).toISOString();

  const aheadBy = client - received;
  if (aheadBy > MAX_AHEAD_MS || aheadBy < -MAX_BEHIND_MS) return new Date(received).toISOString();
  return new Date(client).toISOString();
}
