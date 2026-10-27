"use client";

import { Loader2, LogOut, UserCheck } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { recordTimeIn, recordTimeOut } from "./actions";

const KINDS = {
  time_in: {
    Icon: UserCheck,
    label: "Record time in",
    words: "time in",
    when: "Use this when their card didn't work or they don't have one.",
    record: recordTimeIn,
  },
  time_out: {
    Icon: LogOut,
    label: "Record time out",
    words: "time out",
    when: "Use this when they're leaving and their card didn't work or they don't have one.",
    record: recordTimeOut,
  },
} as const;

/**
 * "Record time in" (Step 55) or "Record time out" (Step 59.4) on a
 * student's attendance row, for when their card didn't work or they have
 * none. Each sits where its time will appear, and only while it can be
 * recorded: a time in before any tap, a time out while the student is in.
 * Their parents are told, so it asks first. The server checks again, so
 * two staff members, or two clicks, still make one tap.
 *
 * `table` is a small outline button for the desktop table; `card` is a
 * quieter text button for a phone card, still 44px tall to tap.
 */
export function RecordTapButton({
  kind,
  studentId,
  studentName,
  layout,
  className,
}: {
  kind: keyof typeof KINDS;
  studentId: string;
  studentName: string;
  layout: "table" | "card";
  className?: string;
}) {
  const { Icon, label, words, when, record } = KINDS[kind];
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleRecord() {
    startTransition(async () => {
      const result = await record(studentId);
      setConfirmOpen(false);
      if (result.ok) toast(`${result.studentName}'s ${words} was recorded at ${result.time}`);
      else toast.error(result.error);
    });
  }

  return (
    <>
      <Button
        variant={layout === "table" ? "outline" : "ghost"}
        size="sm"
        disabled={isPending}
        onClick={() => setConfirmOpen(true)}
        aria-label={`${label} for ${studentName}`}
        className={cn(
          layout === "table" ? "text-foreground" : "-mr-2 min-h-11 px-2 text-sm text-link hover:text-link",
          className,
        )}
      >
        <Icon aria-hidden="true" />
        {label}
      </Button>

      <Dialog open={confirmOpen} onOpenChange={(open) => !isPending && setConfirmOpen(open)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>
              Record {studentName}&apos;s {words} now?
            </DialogTitle>
            <DialogDescription>
              {when} It&apos;s recorded with the time right now and your name, and their parents are told.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleRecord} disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              {isPending ? "Recording…" : label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
