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
import { formatSchoolTime } from "@/lib/school-time";
import type { NotificationKind } from "@/features/parents/types";

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
        <ol className="flex flex-col divide-y divide-border">
          {taps.map((tap, index) => (
            <li key={tap.id} className="flex items-center justify-between gap-4 py-2.5">
              <span className="text-foreground">
                {index + 1}. {tap.kind === "time_in" ? "In" : "Out"}
              </span>
              <time dateTime={tap.tappedAt} className="text-muted-foreground tabular-nums">
                {formatSchoolTime(tap.tappedAt)}
              </time>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  );
}
