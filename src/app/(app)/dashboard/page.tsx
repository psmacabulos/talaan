import { PageHeader } from "@/components/page-header";
import {
  alertRepository,
  cardRepository,
  schoolRepository,
  staffRepository,
  studentRepository,
  tapRepository,
} from "@/data/repositories";
import { getSession } from "@/lib/session";
import { AttendanceHero } from "@/features/attendance/attendance-hero";
import { ClassRoll } from "@/features/attendance/class-roll";
import { GradeBreakdown } from "@/features/attendance/grade-breakdown";
import { LiveTapFeed } from "@/features/attendance/live-tap-feed";
import { NeedsAttention } from "@/features/attendance/needs-attention";
import { NoSchoolSelected } from "@/features/attendance/no-school-selected";
import { attendanceByGrade, countByStatus } from "@/features/attendance/status";
import { deriveCardStatus } from "@/features/students/card-status";

/** A plain bordered panel with a heading — the dashboard's repeated container. */
function DashboardCard({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-heading text-base font-semibold text-foreground">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

export default async function DashboardPage() {
  const session = await getSession();
  const signedInStaff = await staffRepository.getById(session.userId);

  // Only a super admin can be school-less (staff schema's own rule), and
  // there's no "view school X as super admin" mechanism until Step 20.
  if (!session.schoolId) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader as="h2" title="Dashboard" description="Attendance for one school at a time." />
        <NoSchoolSelected />
      </div>
    );
  }

  const [school, students, taps] = await Promise.all([
    schoolRepository.getById(session.schoolId),
    studentRepository.listBySchool(session.schoolId),
    tapRepository.listBySchool(session.schoolId),
  ]);

  // "Good morning" is fixed, not computed from the real clock: every piece
  // of data on this page is measured against DASHBOARD_NOW (status.ts), a
  // fixed 9:15 AM in Phase 1's sample data. A greeting that said "Good
  // evening" over a 9:15 AM dashboard would just look broken.
  const firstName = signedInStaff?.firstName ?? "there";

  if (session.role === "teacher") {
    const classStudents = students.filter(
      (student) =>
        student.gradeLevel === signedInStaff?.advisoryGradeLevel &&
        student.section === signedInStaff?.advisorySection,
    );
    const classStudentIds = new Set(classStudents.map((student) => student.id));
    const classTaps = taps.filter((tap) => tap.studentId && classStudentIds.has(tap.studentId));

    // One lookup per student rather than a new repository method — an
    // advisory class is a handful of students, and this keeps the change
    // inside Step 13 instead of reopening Step 9's repository interfaces.
    // The full card history, not just the active card, so a phone can tell
    // "No card" from "Lost" (Step 27.8), the same as the Attendance page.
    const cardsByStudent = await Promise.all(
      classStudents.map((student) => cardRepository.listByStudent(student.id)),
    );
    const rollRows = classStudents.map((student, index) => ({
      student,
      cardStatus: deriveCardStatus(cardsByStudent[index] ?? []),
    }));

    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          as="h2"
          title={`Good morning, ${firstName}`}
          description={
            signedInStaff?.advisoryGradeLevel && signedInStaff.advisorySection
              ? `Your advisory class, Grade ${signedInStaff.advisoryGradeLevel} – ${signedInStaff.advisorySection}.`
              : "Your advisory class."
          }
        />

        <AttendanceHero
          eyebrow="Your class today"
          subjectLabel="students are in school"
          counts={countByStatus(classStudents, classTaps)}
        />

        {/* items-start so each card sizes to its own content — without it
            the shorter card stretches to match the taller one, leaving a
            large empty area inside it. */}
        <div className="grid items-start gap-6 xl:grid-cols-[1.2fr_1fr]">
          <DashboardCard title="Class roll">
            <ClassRoll rows={rollRows} taps={classTaps} />
          </DashboardCard>
          <DashboardCard title="Live taps in your class">
            <LiveTapFeed taps={classTaps} students={classStudents} />
          </DashboardCard>
        </div>
      </div>
    );
  }

  const alerts = await alertRepository.listBySchool(session.schoolId);
  const openAlerts = alerts.filter((alert) => !alert.acknowledged);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        as="h2"
        title={
          session.role === "super_admin" ? `Viewing ${school?.name ?? "this school"}` : `Good morning, ${firstName}`
        }
        description={
          session.role === "super_admin"
            ? "You're seeing this school as a super admin."
            : "Here's who is in school right now."
        }
      />

      <AttendanceHero
        eyebrow="Today's attendance"
        subjectLabel="students are in school"
        counts={countByStatus(students, taps)}
      />

      {/* items-start so each card sizes to its own content — see the
          teacher branch above for why. */}
      <div className="grid items-start gap-6 xl:grid-cols-[1.2fr_1fr]">
        <DashboardCard title="Attendance by grade level">
          <GradeBreakdown rows={attendanceByGrade(students, taps)} />
        </DashboardCard>

        <div className="flex flex-col gap-6">
          <DashboardCard
            title="Needs attention"
            aside={
              <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                {openAlerts.length} open
              </span>
            }
          >
            <NeedsAttention alerts={openAlerts} taps={taps} students={students} />
          </DashboardCard>

          <DashboardCard title="Live taps">
            <LiveTapFeed taps={taps} students={students} />
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}
