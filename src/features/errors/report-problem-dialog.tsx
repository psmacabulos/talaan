"use client";

import { useId, useState } from "react";
import { CircleAlert, CircleCheck, LoaderCircle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PRODUCT_NAME } from "@/lib/product";

/** Long enough to say what happened, short enough to stay a note. */
export const NOTE_MAX_LENGTH = 300;

type Status = "idle" | "sending" | "sent" | "failed";

const ANNOUNCEMENTS: Record<Status, string> = {
  idle: "",
  sending: "Sending your report…",
  sent: "Thanks, we got it. Your report has been sent.",
  failed: "Could not send the report.",
};

/**
 * "Report this problem" (Step 59.1): an optional note, then Send. Its four
 * states follow the owner's design: idle, sending, sent and failed. A failed
 * send keeps the note, so nothing typed is lost.
 */
export function ReportProblemDialog({
  open,
  onOpenChange,
  onSend,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (note: string) => Promise<void>;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [note, setNote] = useState("");
  const noteId = useId();
  const countId = useId();

  async function send() {
    setStatus("sending");
    try {
      await onSend(note);
      setStatus("sent");
      setNote("");
    } catch {
      setStatus("failed");
    }
  }

  function changeOpen(next: boolean) {
    if (!next && status === "sending") return;
    onOpenChange(next);
    // Opening again shows the form; a note that failed to send is still in it.
    if (!next) setStatus("idle");
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="gap-5 p-6 sm:max-w-md" showCloseButton={status !== "sending"}>
        {status === "sent" || status === "failed" ? (
          <ReportResult status={status} onClose={() => changeOpen(false)} onRetry={send} />
        ) : (
          <>
            <div className="flex flex-col gap-2 pr-8">
              <DialogTitle className="text-lg font-semibold">Report this problem</DialogTitle>
              <DialogDescription>
                Help us improve {PRODUCT_NAME}. Tell us what you were doing when this happened. Optional. Don&apos;t
                include student names.
              </DialogDescription>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={noteId} className="sr-only">
                What were you doing? (optional)
              </Label>
              <Textarea
                id={noteId}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={NOTE_MAX_LENGTH}
                rows={4}
                disabled={status === "sending"}
                aria-describedby={countId}
                placeholder="For example: I was trying to mark attendance at the gate."
                className="min-h-28 resize-none"
              />
              <p id={countId} className="self-end text-xs text-muted-foreground tabular-nums">
                {note.length}/{NOTE_MAX_LENGTH}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" size="lg" disabled={status === "sending"} onClick={() => changeOpen(false)}>
                Cancel
              </Button>
              <Button size="lg" disabled={status === "sending"} onClick={send}>
                {status === "sending" ? (
                  <>
                    <LoaderCircle data-icon="inline-start" className="animate-spin motion-reduce:animate-none" />
                    Sending…
                  </>
                ) : (
                  "Send"
                )}
              </Button>
            </div>
          </>
        )}
        <p className="sr-only" aria-live="polite">
          {ANNOUNCEMENTS[status]}
        </p>
      </DialogContent>
    </Dialog>
  );
}

function ReportResult({
  status,
  onClose,
  onRetry,
}: {
  status: "sent" | "failed";
  onClose: () => void;
  onRetry: () => void;
}) {
  const sent = status === "sent";
  return (
    <div className="flex flex-col items-center gap-5 pt-2 text-center">
      <span
        className={
          sent
            ? "flex size-16 items-center justify-center rounded-full bg-status-present-bg text-status-present"
            : "flex size-16 items-center justify-center rounded-full bg-status-absent-bg text-destructive"
        }
      >
        {sent ? (
          <CircleCheck className="size-8" aria-hidden="true" />
        ) : (
          <CircleAlert className="size-8" aria-hidden="true" />
        )}
      </span>
      <div className="flex flex-col gap-2">
        <DialogTitle className="text-lg font-semibold">
          {sent ? "Thanks, we got it" : "Could not send the report"}
        </DialogTitle>
        <DialogDescription>
          {sent
            ? "Your report has been sent. We'll look into this."
            : "There was a problem sending your report. Please try again."}
        </DialogDescription>
      </div>
      {sent ? (
        <Button size="lg" className="w-full" autoFocus onClick={onClose}>
          Done
        </Button>
      ) : (
        <div className="grid w-full grid-cols-2 gap-3">
          <Button variant="outline" size="lg" onClick={onClose}>
            Cancel
          </Button>
          <Button size="lg" autoFocus onClick={onRetry}>
            <RotateCw data-icon="inline-start" />
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
