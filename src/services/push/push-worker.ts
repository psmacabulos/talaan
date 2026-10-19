import { GIVE_UP_AFTER_MS, PUSH_BATCH, sendDue, type PushDeps } from "./send-due";

/** What one pass did, for one log line. Counts only, never a name or a token. */
export type PushPassSummary = { sent: number; retrying: number; failed: number; phonesGone: number; tooOld: number };

/**
 * One pass of the push worker (Step 54): turn every notification still to
 * push into deliveries, then send every delivery that's due, 100 at a time,
 * until a batch comes back short.
 */
export async function runPushPass(deps: PushDeps): Promise<PushPassSummary> {
  const summary: PushPassSummary = { sent: 0, retrying: 0, failed: 0, phonesGone: 0, tooOld: 0 };

  for (;;) {
    const fanned = await deps.outbox.fanOut(PUSH_BATCH, GIVE_UP_AFTER_MS);
    summary.tooOld += fanned.tooOld;
    if (fanned.notifications < PUSH_BATCH) break;
  }

  for (;;) {
    const results = await sendDue(deps);
    for (const result of results) {
      if (result.outcome === "sent") summary.sent += 1;
      else if (result.outcome === "retry") summary.retrying += 1;
      else if (result.outcome === "failed") summary.failed += 1;
      else summary.phonesGone += 1;
    }
    if (results.length < PUSH_BATCH) break;
  }

  if (Object.values(summary).some((count) => count > 0)) {
    const { sent, retrying, failed, phonesGone, tooOld } = summary;
    console.info(
      `push: sent ${sent}, retrying ${retrying}, failed ${failed}, phones gone ${phonesGone}, too old ${tooOld}`,
    );
  }
  return summary;
}

/** A failure's name and code only: a database error's message can carry the values it was given. */
function describeError(error: unknown): string {
  if (!(error instanceof Error)) return "unknown";
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? `${error.name} ${code}` : error.name;
}

export type PushWorker = {
  /** Runs a pass now, or right after the one in progress, so a tap during a pass never waits for the timer. */
  wake(): Promise<void>;
};

/** One pass at a time. A failed pass is logged and the next wake tries again. */
export function createPushWorker(deps: PushDeps): PushWorker {
  let running = false;
  let again = false;
  return {
    async wake() {
      if (running) {
        again = true;
        return;
      }
      running = true;
      try {
        do {
          again = false;
          await runPushPass(deps);
        } while (again);
      } catch (error) {
        console.error(`push: a pass failed (${describeError(error)}); the next one tries again`);
      } finally {
        running = false;
      }
    },
  };
}

/** The server's one worker, on globalThis: the start-up hook and the route handlers are bundled apart. */
const globalForPush = globalThis as unknown as { pushWorker?: PushWorker };

/** How often the worker looks without being woken: for retries, and anything a wake missed. */
export const PUSH_CHECK_EVERY_MS = 30_000;

/** Starts the worker once per server (`src/instrumentation.ts`). A second call does nothing. */
export function startPushWorker(deps: PushDeps): void {
  if (globalForPush.pushWorker) return;
  const worker = createPushWorker(deps);
  globalForPush.pushWorker = worker;
  setInterval(() => void worker.wake(), PUSH_CHECK_EVERY_MS).unref();
  void worker.wake();
}

/**
 * Called right after a notification is written (the gate, Simulate a tap,
 * the station), so the push goes now, not at the next check. Does nothing
 * where no worker was started: tests, and the build.
 */
export function wakePushWorker(): void {
  void globalForPush.pushWorker?.wake();
}
