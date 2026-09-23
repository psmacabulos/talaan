import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusPill } from "@/components/status-pill";
import { CardStatusBadge } from "@/features/students/card-status-badge";
import { StudentAvatar, studentName } from "@/features/students/student-display";
import { AttendanceCardList } from "./attendance-card-list";
import type { AttendanceRow } from "./attendance-table";
import type { Tap } from "./types";
import { formatTapTime, studentStatus, todaysTap } from "./status";

/**
 * The teacher dashboard variant's roster — every student in the advisory
 * class, not just the ones who've tapped.
 *
 * A student with no ID card sits on "Absent" every single morning and can
 * never tap in. Saying only "No tap yet" for them hides the actual reason
 * and makes the teacher wonder why the student never appears, so those
 * rows show a "No card" or "Lost" tag instead, the same tag every other
 * list uses (on desktop too since Step 27.8's review, where it used to say
 * "No ID card linked yet").
 *
 * Below 768px it's the Attendance page's card layout as divided rows
 * (Step 27.8), since this list already sits inside the dashboard's bordered
 * panel; from 768px up, the table as before.
 */
export function ClassRoll({ rows, taps }: { rows: AttendanceRow[]; taps: Tap[] }) {
  return (
    <>
      <div className="md:hidden">
        <AttendanceCardList rows={rows} taps={taps} label="Class roll" variant="rows" />
      </div>
      <div className="hidden md:block">
        {/* No wrapping frame: Table already renders its own overflow-x-auto
            container, and a bordered box inside the card's own border
            double-frames this list against the flush "Live taps" list in
            the next card. px-0 on every cell keeps the roll on the card's
            inner left edge, same as that list. */}
        <Table label="Class roll">
          <TableHeader>
            <TableRow>
              <TableHead className="px-0 text-xs text-muted-foreground">Student</TableHead>
              <TableHead className="px-0 text-right text-xs text-muted-foreground">Today</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ student, cardStatus }) => {
              const tap = todaysTap(student.id, taps);
              return (
                <TableRow key={student.id}>
                  <TableCell className="px-0">
                    <div className="flex items-center gap-3">
                      <StudentAvatar student={student} />
                      <div>
                        <p className="font-medium text-foreground">{studentName(student)}</p>
                        {tap ? (
                          <p className="text-sm text-muted-foreground">In at {formatTapTime(tap.tappedAt)}</p>
                        ) : cardStatus !== "active" ? (
                          <CardStatusBadge status={cardStatus} className="mt-1 px-2 py-0.5" />
                        ) : (
                          <p className="text-sm text-muted-foreground">No tap yet</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-0 text-right">
                    <StatusPill status={studentStatus(student.id, taps)} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
