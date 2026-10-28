"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { NotificationKind } from "@/features/parents/types";
import { DayTapList } from "./day-tap-list";

/**
 * "4 taps": shown only when a student came and went more than once in a
 * day (Step 49). Opens the whole day in order, each tap labelled in or out.
 * The dialog traps focus and hands it back to this button when it closes.
 */
export function DayTapsButton({
  studentName,
  dateLabel,
  taps,
}: {
  studentName: string;
  dateLabel: string;
  taps: { id: string; tappedAt: string; kind: NotificationKind }[];
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs">
          {taps.length} taps
          <span className="sr-only">, show all of {studentName}&apos;s taps</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{studentName}&apos;s taps</DialogTitle>
          <DialogDescription>{dateLabel}</DialogDescription>
        </DialogHeader>
        <DayTapList taps={taps} />
      </DialogContent>
    </Dialog>
  );
}
