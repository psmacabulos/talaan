import { CalendarCheck } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import {
  cardRepository,
  schoolRepository,
  staffRepository,
  studentRepository,
  tapRepository,
} from "@/data/repositories";
import { AttendanceList } from "@/features/attendance/attendance-list";
import type { AttendanceRow } from "@/features/attendance/attendance-table";
import {
  classOptionsFromRoster,
  formatAttendanceDateLabel,
  parseAttendanceDate,
  resolveClassSelection,
} from "@/features/attendance/attendance-search-params";
import { AttendanceToolbar } from "@/features/attendance/attendance-toolbar";
import { NoSchoolSelected } from "@/features/attendance/no-school-selected";
import { countByStatus, DEFAULT_ATTENDANCE_TIMES, schoolDayFor } from "@/features/attendance/status";
import { deriveCardStatus } from "@/features/students/card-status";
import { getNow } from "@/lib/clock";
import { schoolDateOf } from "@/lib/school-time";
import { getSession } from "@/lib/session";

function AttendancePageShell({ description, children }: { description: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader as="h2" title="Attendance" description={description} />
      {children}
    </div>
  );
}

export default async function AttendancePage({ searchParams }: PageProps<"/attendance">) {
  const session = await getSession();

  // Same guard as the dashboard and Students list: only a super admin can be
  // school-less, and there's no "view school X" mechanism until Step 25.
  if (!session.schoolId) {
    return (
      <AttendancePageShell description="Pick a date and class to see who tapped in.">
        <NoSchoolSelected subject="attendance page" />
      </AttendancePageShell>
    );
  }

  const isTeacher = session.role === "teacher";
  const signedInStaff = isTeacher ? await staffRepository.getById(session.userId) : null;
  const lockedTo =
    isTeacher && signedInStaff?.advisoryGradeLevel && signedInStaff.advisorySection
      ? { gradeLevel: signedInStaff.advisoryGradeLevel, section: signedInStaff.advisorySection }
      : undefined;

  if (isTeacher && !lockedTo) {
    return (
      <AttendancePageShell description="Pick a date and class to see who tapped in.">
        <EmptyState
          icon={CalendarCheck}
          title="No advisory class assigned yet"
          description="Ask a principal or super admin to set your advisory grade and section."
        />
      </AttendancePageShell>
    );
  }

  // Opens on today, on the school's clock: the real date, or the demo
  // morning's when DEMO_NOW pins it (src/lib/clock.ts).
  const now = getNow();
  const today = schoolDateOf(now);
  const rawParams = await searchParams;
  const date = parseAttendanceDate(rawParams.date, today);

  const allStudents = await studentRepository.listBySchool(session.schoolId);
  const options = classOptionsFromRoster(allStudents);
  const selected = resolveClassSelection(rawParams.grade, rawParams.section, options, lockedTo);

  if (!selected) {
    return (
      <AttendancePageShell description="Pick a date and class to see who tapped in.">
        <EmptyState
          icon={CalendarCheck}
          title="No students enrolled yet"
          description="Add students to this school to see attendance."
        />
      </AttendancePageShell>
    );
  }

  const classStudents = allStudents.filter(
    (student) => student.gradeLevel === selected.gradeLevel && student.section === selected.section,
  );

  const description = isTeacher
    ? `Your advisory class, Grade ${selected.gradeLevel} – ${selected.section}.`
    : "Pick a date and class to see who tapped in.";

  const [taps, cardsByStudent, school] = await Promise.all([
    tapRepository.listBySchoolOnDate(session.schoolId, date),
    Promise.all(classStudents.map((student) => cardRepository.listByStudent(student.id))),
    schoolRepository.getById(session.schoolId),
  ]);

  // A finished day with no taps at all, anywhere in the school, was most
  // likely a weekend, a holiday or a day the gate was off. Marking the
  // whole class absent would be wrong, so say so plainly instead.
  let body: React.ReactNode;
  if (date < today && taps.length === 0) {
    body = (
      <EmptyState
        icon={CalendarCheck}
        title="No taps that day"
        description={`Nobody at this school tapped in on ${formatAttendanceDateLabel(date)}. Weekends, holidays and days the gate was off look like this.`}
      />
    );
  } else {
    const rows: AttendanceRow[] = classStudents.map((student, index) => ({
      student,
      cardStatus: deriveCardStatus(cardsByStudent[index] ?? []),
    }));
    const day = schoolDayFor(date, now, school ?? DEFAULT_ATTENDANCE_TIMES);
    body = <AttendanceList rows={rows} taps={taps} day={day} counts={countByStatus(classStudents, taps, day)} />;
  }

  return (
    <AttendancePageShell description={description}>
      <AttendanceToolbar date={date} selected={selected} options={options} showClassPicker={!isTeacher} />
      {body}
    </AttendancePageShell>
  );
}
