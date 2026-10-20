import { StatusPill } from "@/components/status-pill";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CardStatusBadge } from "@/features/students/card-status-badge";
import type { CardFilterStatus } from "@/features/students/card-status";
import { StudentAvatar, studentName } from "@/features/students/student-display";
import type { Student } from "@/features/students/types";
import { DayTapsIndicator } from "./day-taps";
import { ManualTapNote } from "./manual-tap-note";
import { RecordTimeInButton } from "./record-time-in-button";
import { dayTapSummary, formatTapTime, studentStatus, type SchoolDay } from "./status";
import type { Tap } from "./types";

export interface AttendanceRow {
  student: Student;
  cardStatus: CardFilterStatus;
}

/**
 * One class's roll for one day — every enrolled student, tapped or not, the
 * same "who's actually here" question `ClassRoll` (the dashboard's compact
 * card version) answers, just as a page of its own with a Card column too.
 * From 768px up; phones get `AttendanceCardList` instead (Step 27.8).
 * Time in is the first tap of the day, Time out the last one when it is a
 * time out, and "N taps" opens the whole day when there were more than two
 * (Step 49, `dayTapSummary`). On today's roll, a student with no tap yet
 * gets "Record time in" in the Time in cell, where the time will appear
 * (Step 55).
 */
export function AttendanceTable({
  rows,
  taps,
  day,
  canRecordTimeIn = false,
}: {
  rows: AttendanceRow[];
  taps: Tap[];
  day: SchoolDay;
  /** Today's roll: offer "Record time in" to students with no tap yet. */
  canRecordTimeIn?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table label="Attendance">
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Time in</TableHead>
            <TableHead>Time out</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Card</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ student, cardStatus }) => {
            const summary = dayTapSummary(student.id, taps, day);
            return (
              <TableRow key={student.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <StudentAvatar student={student} />
                    <div>
                      <p className="font-medium text-foreground">{studentName(student)}</p>
                      {student.lrn ? <p className="text-sm text-muted-foreground">LRN {student.lrn}</p> : null}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground tabular-nums">
                  {summary.timeIn ? (
                    <>
                      {formatTapTime(summary.timeIn.tappedAt)}
                      <ManualTapNote tap={summary.timeIn} className="block" />
                    </>
                  ) : canRecordTimeIn ? (
                    <RecordTimeInButton studentId={student.id} studentName={studentName(student)} layout="table" />
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground tabular-nums">
                  <div className="flex items-center gap-2">
                    {summary.timeOut ? formatTapTime(summary.timeOut.tappedAt) : "—"}
                    <DayTapsIndicator summary={summary} studentName={studentName(student)} date={day.date} />
                  </div>
                </TableCell>
                <TableCell>
                  <StatusPill status={studentStatus(student.id, taps, day)} flexible={day.flexible} />
                </TableCell>
                <TableCell>
                  <CardStatusBadge status={cardStatus} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
