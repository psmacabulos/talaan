import { PARENT_TOKEN_UNUSED_LIMIT_MS } from "@/services/parents/parent-token";
import { checkReceipts, type ReceiptSummary } from "./check-receipts";
import { GIVE_UP_AFTER_MS, PUSH_BATCH, sendDue, type PushDeps } from "./send-due";

/** A failed push is kept this long, for looking into a problem, then deleted (Step 54.1). */
export const FAILED_KEEP_MS = 7 * 24 * 60 * 60_000;

/** How often old rows and 30-day sign-ins are cleared. */
export const CLEAN_UP_EVERY_MS = 60 * 60_000;

/** The cleanup deletes this many rows per statement, and at most this many statements a run (20,000 rows an hour). */
const CLEAN_UP_BATCH = 1_000;
const CLEAN_UP_MAX_BATCHES = 20;

/** What one pass did, for one log line. Counts only, never a name or a token. */
export type PushPassSummary = {
  sent: number;
  retrying: number;
  failed: number;
  phonesGone: number;
  tooOld: number;
  receipts: ReceiptSummary | null;
  cleanedUp: { failedDeliveries: number; signIns: number } | null;
};

/** The housekeeping a pass may do, when it has nothing to send (Step 54.1). */
export type PushUpkeep = { receipts: boolean; cleanUp: boolean };

/**
 * One pass of the push worker (Step 54): turn every notification still to
 * push into deliveries, then send every delivery that's due, 100 at a time,
 * until a batch comes back short. Then, only if there was nothing to send,
 * the upkeep it's asked for (Step 54.1): read the receipts that are due,
 * and clear old rows. A busy pass skips it, so the morning rush is never
 * slowed by it; the next quiet check does it.
 */
export async function runPushPass(
  deps: PushDeps,
  upkeep: PushUpkeep = { receipts: false, cleanUp: false },
): Promise<PushPassSummary> {
  const summary: PushPassSummary = {
    sent: 0,
    retrying: 0,
    failed: 0,
    phonesGone: 0,
    tooOld: 0,
    receipts: null,
    cleanedUp: null,
  };
  let deliveriesMade = 0;

  for (;;) {
    const fanned = await deps.outbox.fanOut(PUSH_BATCH, {
      maxAgeMs: GIVE_UP_AFTER_MS,
      signInUnusedMs: PARENT_TOKEN_UNUSED_LIMIT_MS,
    });
    summary.tooOld += fanned.tooOld;
    deliveriesMade += fanned.deliveries;
    if (fanned.notifications < PUSH_BATCH) break;
  }

  let sends = 0;
  for (;;) {
    const results = await sendDue(deps);
    sends += results.length;
    for (const result of results) {
      if (result.outcome === "sent") summary.sent += 1;
      else if (result.outcome === "retry") summary.retrying += 1;
      else if (result.outcome === "failed") summary.failed += 1;
      else summary.phonesGone += 1;
    }
    if (results.length < PUSH_BATCH) break;
  }

  const quiet = deliveriesMade === 0 && sends === 0;
  if (quiet && upkeep.receipts) summary.receipts = await checkReceipts(deps);
  if (quiet && upkeep.cleanUp) {
    summary.cleanedUp = await deps.outbox.cleanUp({
      failedKeepMs: FAILED_KEEP_MS,
      signInUnusedMs: PARENT_TOKEN_UNUSED_LIMIT_MS,
      batch: CLEAN_UP_BATCH,
      maxBatches: CLEAN_UP_MAX_BATCHES,
    });
  }

  logSummary(summary);
  return summary;
}

/** One line, only when something happened. */
function logSummary(summary: PushPassSummary): void {
  const { sent, retrying, failed, phonesGone, tooOld, receipts, cleanedUp } = summary;
  const parts: string[] = [];
  if (sent + retrying + failed + phonesGone + tooOld > 0) {
    parts.push(`sent ${sent}, retrying ${retrying}, failed ${failed}, phones gone ${phonesGone}, too old ${tooOld}`);
  }
  if (receipts && Object.values(receipts).some((count) => count > 0)) {
    parts.push(
      `receipts ok ${receipts.delivered}, not ready ${receipts.notReady}, sent again ${receipts.resent}, failed ${receipts.failed}, phones gone ${receipts.phonesGone}`,
    );
  }
  if (cleanedUp && cleanedUp.failedDeliveries + cleanedUp.signIns > 0) {
    parts.push(`cleared ${cleanedUp.failedDeliveries} failed push(es) and ${cleanedUp.signIns} old sign-in(s)`);
  }
  if (parts.length > 0) console.info(`push: ${parts.join("; ")}`);
}

/** A failure's name and code only: a database error's message can carry the values it was given. */
function describeError(error: unknown): string {
  if (!(error instanceof Error)) return "unknown";
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? `${error.name} ${code}` : error.name;
}

export type PushWorker = {
  /** After a notification is written: send now, or right after the pass in progress. No upkeep. */
  wake(): Promise<void>;
  /** The 5-minute check: retries, plus receipts and (hourly) cleanup if there's nothing to send. */
  tick(): Promise<void>;
};

/** One pass at a time. A failed pass is logged and the next wake or tick tries again. */
export function createPushWorker(deps: PushDeps, now: () => number = Date.now): PushWorker {
  let running = false;
  let again = false;
  let upkeepWanted = false;
  let lastCleanUpAt = Number.NEGATIVE_INFINITY;

  async function run(withUpkeep: boolean) {
    if (withUpkeep) upkeepWanted = true;
    if (running) {
      again = true;
      return;
    }
    running = true;
    try {
      do {
        again = false;
        const upkeep = upkeepWanted;
        upkeepWanted = false;
        const summary = await runPushPass(deps, {
          receipts: upkeep,
          cleanUp: upkeep && now() - lastCleanUpAt >= CLEAN_UP_EVERY_MS,
        });
        if (summary.cleanedUp) lastCleanUpAt = now();
      } while (again);
    } catch (error) {
      console.error(`push: a pass failed (${describeError(error)}); the next one tries again`);
    } finally {
      running = false;
    }
  }

  return { wake: () => run(false), tick: () => run(true) };
}

/** The server's one worker, on globalThis: the start-up hook and the route handlers are bundled apart. */
const globalForPush = globalThis as unknown as { pushWorker?: PushWorker };

/**
 * How often the worker looks without being woken (owner decision,
 * 2026-10-19: every 5 minutes, not 30 seconds). New taps never wait for
 * it: each one wakes the worker. Only retries and receipts wait for it.
 */
export const PUSH_CHECK_EVERY_MS = 5 * 60_000;

/** Starts the worker once per server (`src/instrumentation.ts`). A second call does nothing. */
export function startPushWorker(deps: PushDeps): void {
  if (globalForPush.pushWorker) return;
  const worker = createPushWorker(deps);
  globalForPush.pushWorker = worker;
  setInterval(() => void worker.tick(), PUSH_CHECK_EVERY_MS).unref();
  void worker.tick();
}

/**
 * Called right after a notification is written (the gate, Simulate a tap,
 * the station), so the push goes now, not at the next check. Does nothing
 * where no worker was started: tests, and the build.
 */
export function wakePushWorker(): void {
  void globalForPush.pushWorker?.wake();
}
