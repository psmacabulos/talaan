"use client";

import { BellOff, ChevronRight, Loader2 } from "lucide-react";
import { SchoolLogo } from "./school-logo";
import type { SchoolRow } from "./types";
import { useOpenSchool } from "./use-open-school";

/** "36 students · 4 staff". */
export function schoolCounts(studentCount: number, staffCount: number): string {
  return `${studentCount} ${studentCount === 1 ? "student" : "students"} · ${staffCount} staff`;
}

function SchoolCard({ row }: { row: SchoolRow }) {
  const { school, studentCount, staffCount } = row;
  const { isPending, open } = useOpenSchool(school.id);

  return (
    <li className="relative flex min-h-16 items-center gap-3 rounded-lg border border-border bg-card py-3 pr-1 pl-4 transition-colors hover:bg-muted/50 active:bg-muted has-focus-visible:border-ring has-focus-visible:ring-2 has-focus-visible:ring-ring/50">
      <SchoolLogo name={school.name} logoUrl={school.logoUrl} className="size-10" />
      <div className="min-w-0 flex-1">
        <h3 className="text-base leading-snug font-semibold wrap-break-word text-foreground">
          {/* Same stretched button as a student card: its invisible ::after
              covers the whole card, so a tap anywhere opens the school. */}
          <button
            type="button"
            onClick={open}
            disabled={isPending}
            aria-label={isPending ? `Opening ${school.name}…` : `Open ${school.name}`}
            className="text-left outline-none after:absolute after:inset-0 after:rounded-lg"
          >
            {school.name}
          </button>
        </h3>
        {/* The tag sits on this second line, as Invited does on a staff
            card, so a long school name keeps the card's full width. */}
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="text-sm leading-snug text-muted-foreground">{schoolCounts(studentCount, staffCount)}</p>
          {school.notificationPreference === "off" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-status-idle-bg px-2 py-0.5 text-xs font-medium text-status-idle">
              <BellOff className="size-3" aria-hidden="true" />
              Notifications off
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex size-11 shrink-0 items-center justify-center text-muted-foreground" aria-hidden="true">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <ChevronRight className="size-5" />}
      </div>
    </li>
  );
}

/**
 * The schools list on screens narrower than 768px (Step 27.8): one card per
 * school, with the name first and the student and staff counts under it.
 * Tapping a card opens that school, the same as the table's Open button.
 *
 * Status by exception: only a school that has turned parent notifications
 * off gets a tag (new schools start on "Time in only"). The theme stays off
 * the card, since it's only about looks and shows as soon as the school is
 * opened. `SchoolsTable` shows every field as columns from 768px up.
 */
export function SchoolsCardList({ items }: { items: SchoolRow[] }) {
  return (
    <ul aria-label="Schools" className="flex flex-col gap-2">
      {items.map((row) => (
        <SchoolCard key={row.school.id} row={row} />
      ))}
    </ul>
  );
}
