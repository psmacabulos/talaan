/**
 * Every mock repository method awaits this before returning, so nothing
 * built against these silently assumes data arrives instantly — a real
 * database call never does. Kept tiny and randomized (not a fixed number)
 * so it reads as "network-ish" rather than a suspiciously round delay.
 *
 * `latencyMs: 0` (what every repository test passes) skips the delay
 * entirely, so the simulation never slows down the test suite.
 */
export function simulateLatency(latencyMs: number): Promise<void> {
  if (latencyMs <= 0) return Promise.resolve();
  const jitter = Math.random() * latencyMs * 0.4;
  return new Promise((resolve) => setTimeout(resolve, latencyMs + jitter));
}

/** The default latency a repository singleton uses when the app actually runs. */
export const DEFAULT_LATENCY_MS = 150;
