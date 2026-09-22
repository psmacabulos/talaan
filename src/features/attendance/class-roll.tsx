import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusPill } from "@/components/status-pill";
import type { Student } from "@/features/students/types";
import type { Tap } from "./types";
import { formatTapTime, studentStatus, todaysTap } from "./status";

function initials(student: Student): string {
  return `${student.firstName[0]}${student.lastName[0]}`.toUpperCase();
}

/**
 * The teacher dashboard variant's roster — every student in the advisory
 * class, not just the ones who've tapped.
 *
 * `studentIdsWithoutCard` matters more than it looks: a student with no ID
 * card issued yet sits on "Absent" every single morning and can never tap
 * in. Saying only "No tap yet" for them hides the actual reason and makes
 * the teacher wonder why the student never appears — so those rows say
 * what's really going on instead.
 */
export function ClassRoll({
  students,
  taps,
  studentIdsWithoutCard,
}: {
  students: Student[];
  taps: Tap[];
  studentIdsWithoutCard: Set<string>;
}) {
  return (
    // No wrapping frame: Table already renders its own overflow-x-auto
    // container, and a bordered box inside the card's own border double-frames
    // this list against the flush "Live taps" list in the next card. px-0 on
    // every cell keeps the roll on the card's inner left edge, same as that list.
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="px-0 text-xs text-muted-foreground">Student</TableHead>
          <TableHead className="px-0 text-right text-xs text-muted-foreground">Today</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {students.map((student) => {
          const tap = todaysTap(student.id, taps);
          return (
            <TableRow key={student.id}>
              <TableCell className="px-0">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                    {initials(student)}
                  </span>
                  <div>
                    <p className="font-medium text-foreground">
                      {student.firstName} {student.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {tap
                        ? `In at ${formatTapTime(tap.tappedAt)}`
                        : studentIdsWithoutCard.has(student.id)
                          ? "No ID card linked yet"
                          : "No tap yet"}
                    </p>
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
  );
}
