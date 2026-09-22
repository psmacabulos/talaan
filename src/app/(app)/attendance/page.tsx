import { CalendarCheck } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { cardRepository, staffRepository, studentRepository, tapRepository } from "@/data/repositories";
import { AttendanceTable, type AttendanceRow } from "@/features/attendance/attendance-table";
import {
  ATTENDANCE_SEED_DATE,
  attendanceHref,
  classOptionsFromRoster,
  formatAttendanceDateLabel,
  parseAttendanceDate,
  resolveClassSelection,
} from "@/features/attendance/attendance-search-params";
import { AttendanceToolbar } from "@/features/attendance/attendance-toolbar";
import { NoSchoolSelected } from "@/features/attendance/no-school-selected";
import { AttendanceLegend } from "@/features/attendance/segmented-bar";
import { countByStatus } from "@/features/attendance/status";
import { deriveCardStatus } from "@/features/students/card-status";
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
        <NoSchoolSelected />
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

  const rawParams = await searchParams;
  const date = parseAttendanceDate(rawParams.date);

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

  const isSeedDate = date === ATTENDANCE_SEED_DATE;

  let body: React.ReactNode;
  if (!isSeedDate) {
    body = (
      <div className="flex flex-col items-center gap-3">
        <EmptyState
          icon={CalendarCheck}
          title="No records for that date"
          description={`This demo only has sample attendance for ${formatAttendanceDateLabel(ATTENDANCE_SEED_DATE)}.`}
        />
        <Link
          href={attendanceHref({ date: ATTENDANCE_SEED_DATE, gradeLevel: selected.gradeLevel, section: selected.section })}
          className="rounded-sm text-sm font-medium text-link underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Jump to {formatAttendanceDateLabel(ATTENDANCE_SEED_DATE)}
        </Link>
      </div>
    );
  } else {
    const [taps, cardsByStudent] = await Promise.all([
      tapRepository.listBySchool(session.schoolId),
      Promise.all(classStudents.map((student) => cardRepository.listByStudent(student.id))),
    ]);

    const rows: AttendanceRow[] = classStudents.map((student, index) => ({
      student,
      cardStatus: deriveCardStatus(cardsByStudent[index] ?? []),
    }));

    body = (
      <>
        <AttendanceLegend counts={countByStatus(classStudents, taps, `${date}T09:15:00Z`)} />
        <AttendanceTable rows={rows} taps={taps} now={`${date}T09:15:00Z`} />
      </>
    );
  }

  return (
    <AttendancePageShell description={description}>
      <AttendanceToolbar date={date} selected={selected} options={options} showClassPicker={!isTeacher} />
      {body}
    </AttendancePageShell>
  );
}
