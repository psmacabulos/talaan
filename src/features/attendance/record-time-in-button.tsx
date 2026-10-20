"use client";

import { Loader2, UserCheck } from "lucide-react";
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
import { recordTimeIn } from "./actions";

/**
 * "Record time in" on a student's attendance row (Step 55), for when their
 * card didn't work or they have none. It sits where the time in will
 * appear, and only while there's none: once the student has tapped, the
 * time takes its place. Their parents are told, so it asks first. The
 * server checks "no tap yet today" again, so two staff members, or two
 * clicks, still make one tap.
 *
 * `table` is a small outline button for the desktop table; `card` is a
 * quieter text button for a phone card, still 44px tall to tap.
 */
export function RecordTimeInButton({
  studentId,
  studentName,
  layout,
}: {
  studentId: string;
  studentName: string;
  layout: "table" | "card";
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleRecord() {
    startTransition(async () => {
      const result = await recordTimeIn(studentId);
      setConfirmOpen(false);
      if (result.ok) toast(`${result.studentName}'s time in was recorded at ${result.time}`);
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
        aria-label={`Record time in for ${studentName}`}
        className={cn(layout === "table" ? "text-foreground" : "-mr-2 min-h-11 px-2 text-sm text-link hover:text-link")}
      >
        <UserCheck aria-hidden="true" />
        Record time in
      </Button>

      <Dialog open={confirmOpen} onOpenChange={(open) => !isPending && setConfirmOpen(open)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Record {studentName}&apos;s time in now?</DialogTitle>
            <DialogDescription>
              Use this when their card didn&apos;t work or they don&apos;t have one. It&apos;s recorded with the time
              right now and your name, and their parents are told.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleRecord} disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              {isPending ? "Recording…" : "Record time in"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
