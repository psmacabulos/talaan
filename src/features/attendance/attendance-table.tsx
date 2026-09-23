import { StatusPill } from "@/components/status-pill";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CardStatusBadge } from "@/features/students/card-status-badge";
import type { CardFilterStatus } from "@/features/students/card-status";
import { StudentAvatar, studentName } from "@/features/students/student-display";
import type { Student } from "@/features/students/types";
import { formatTapTime, studentStatus, todaysTap } from "./status";
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
 * No "Time out" column: unlike the prototype, taps don't model a time-out
 * event yet (docs/ATTENDANCE-MODEL.md — only the day's earliest tap counts).
 */
export function AttendanceTable({ rows, taps, now }: { rows: AttendanceRow[]; taps: Tap[]; now: string }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table label="Attendance">
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Time in</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Card</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ student, cardStatus }) => {
            const tap = todaysTap(student.id, taps, now);
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
                <TableCell className="text-muted-foreground">{tap ? formatTapTime(tap.tappedAt) : "—"}</TableCell>
                <TableCell>
                  <StatusPill status={studentStatus(student.id, taps, now)} />
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
