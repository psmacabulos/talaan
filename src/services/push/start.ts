import { pushOutboxRepository } from "@/data/repositories";
import { getPushSender } from "./push-sender";
import { startPushWorker } from "./push-worker";

/** The worker with the real outbox and the sender `PUSH_SENDER` picks. Only `src/instrumentation.ts` imports this. */
export function startDefaultPushWorker(): void {
  startPushWorker({ outbox: pushOutboxRepository, sender: getPushSender() });
}
