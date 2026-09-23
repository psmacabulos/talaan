"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import type { KeyboardEvent } from "react";
import { StatusPill } from "@/components/status-pill";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { studentStatus } from "@/features/attendance/status";
import type { Tap } from "@/features/attendance/types";
import { ageInYears } from "./age";
import { CardStatusBadge } from "./card-status-badge";
import type { StudentListParams, StudentSortField } from "./search-params";
import { studentListHref } from "./search-params";
import type { StudentRow } from "./search-students";

function initials(row: StudentRow): string {
  return `${row.student.firstName[0]}${row.student.lastName[0]}`.toUpperCase();
}

function SortableHeader({
  field,
  label,
  align,
  params,
}: {
  field: StudentSortField;
  label: string;
  align?: "right";
  params: StudentListParams;
}) {
  const isActive = params.sort === field;
  const nextDirection = isActive && params.dir === "asc" ? "desc" : "asc";
  const Icon = isActive ? (params.dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <TableHead
      className={align === "right" ? "text-right" : undefined}
      aria-sort={isActive ? (params.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <Link
        href={studentListHref(params, { sort: field, dir: nextDirection, page: 1 })}
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        {label}
        <Icon className="size-3.5" aria-hidden="true" />
      </Link>
    </TableHead>
  );
}

export function StudentsTable({
  items,
  taps,
  params,
  onRowClick,
}: {
  items: StudentRow[];
  taps: Tap[];
  params: StudentListParams;
  /** When set, every row opens the student's edit drawer (Step 15), with their card history (Step 16) — omitted entirely for teachers, who stay read-only. */
  onRowClick?: (row: StudentRow) => void;
}) {
  function handleKeyDown(event: KeyboardEvent<HTMLTableRowElement>, row: StudentRow) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onRowClick?.(row);
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table label="Students">
        <TableHeader>
          <TableRow>
            <SortableHeader field="name" label="Student" params={params} />
            <TableHead className="text-xs text-muted-foreground">LRN</TableHead>
            <SortableHeader field="grade" label="Grade and section" params={params} />
            <SortableHeader field="age" label="Age" params={params} />
            <SortableHeader field="card" label="Card" params={params} />
            <TableHead className="text-xs text-muted-foreground">Today</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((row) => (
            <TableRow
              key={row.student.id}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={onRowClick ? (event) => handleKeyDown(event, row) : undefined}
              role={onRowClick ? "button" : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              aria-label={onRowClick ? `Edit ${row.student.firstName} ${row.student.lastName}` : undefined}
              className={onRowClick ? "cursor-pointer focus-visible:bg-accent" : undefined}
            >
              <TableCell>
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                    {initials(row)}
                  </span>
                  <div>
                    <p className="font-medium text-foreground">
                      {row.student.firstName} {row.student.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">{row.student.guardianName}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{row.student.lrn ?? "—"}</TableCell>
              <TableCell>
                Grade {row.student.gradeLevel} &ndash; {row.student.section}
              </TableCell>
              <TableCell>{ageInYears(row.student.birthDate)}</TableCell>
              <TableCell>
                <CardStatusBadge status={row.cardStatus} />
              </TableCell>
              <TableCell>
                <StatusPill status={studentStatus(row.student.id, taps)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
