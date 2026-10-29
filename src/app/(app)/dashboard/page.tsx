import { PageHeader } from "@/components/page-header";
import {
  alertRepository,
  cardRepository,
  parentStudentLinkRepository,
  schoolRepository,
  staffRepository,
  studentRepository,
  tapRepository,
} from "@/data/repositories";
import { getNow } from "@/lib/clock";
import { schoolDateOf, schoolMinutesOf } from "@/lib/school-time";
import { requireSession } from "@/lib/session";
import { AttendanceHero } from "@/features/attendance/attendance-hero";
import { ClassRoll } from "@/features/attendance/class-roll";
import { GradeBreakdown } from "@/features/attendance/grade-breakdown";
import { LiveTapFeed, recentFeedTaps } from "@/features/attendance/live-tap-feed";
import { ALERTS_SHOWN, NeedsAttention } from "@/features/attendance/needs-attention";
import { NoSchoolSelected } from "@/features/attendance/no-school-selected";
import { attendanceByGrade, countByStatus, DEFAULT_ATTENDANCE_TIMES, schoolToday } from "@/features/attendance/status";
import { deriveCardStatus } from "@/features/students/card-status";
import { NEW_LINKS_DAYS, NEW_LINKS_SHOWN, NewParentLinks, newLinksLabel } from "@/features/parents/new-parent-links";

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

/** "Good morning" before noon, "Good afternoon" until 6 PM, then "Good evening", on the school's clock. */
function greetingAt(now: string): string {
  const minutes = schoolMinutesOf(now);
  if (minutes < 12 * 60) return "Good morning";
  if (minutes < 18 * 60) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const session = await requireSession();
  const signedInStaff = await staffRepository.getById(session.userId);

  // Only a super admin can have no school: until they open one on the
  // Schools page (Step 50), there's no school to show.
  if (!session.schoolId) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Dashboard" description="Attendance for one school at a time." />
        <NoSchoolSelected />
      </div>
    );
  }

  // Everything on this page is about today on the school's clock: the real
  // time, or the demo morning when DEMO_NOW pins it (src/lib/clock.ts).
  const now = getNow();
  const [school, students, taps] = await Promise.all([
    schoolRepository.getById(session.schoolId),
    studentRepository.listBySchool(session.schoolId),
    tapRepository.listBySchoolOnDate(session.schoolId, schoolDateOf(now)),
  ]);
  // Judged against this school's own late and absent times (Step 44.5).
  const day = schoolToday(now, school ?? DEFAULT_ATTENDANCE_TIMES);

  const firstName = signedInStaff?.firstName ?? "there";
  const greeting = `${greetingAt(now)}, ${firstName}`;

  if (session.role === "teacher") {
    const classStudents = students.filter(
      (student) =>
        student.gradeLevel === signedInStaff?.advisoryGradeLevel && student.section === signedInStaff?.advisorySection,
    );
    const classStudentIds = new Set(classStudents.map((student) => student.id));
    const classTaps = taps.filter((tap) => tap.studentId && classStudentIds.has(tap.studentId));

    // One lookup per student rather than a new repository method — an
    // advisory class is a handful of students, and this keeps the change
    // inside Step 13 instead of reopening Step 9's repository interfaces.
    // The full card history, not just the active card, so a phone can tell
    // "No card" from "Lost" (Step 27.8), the same as the Attendance page.
    const schoolId = session.schoolId;
    const cardsByStudent = await Promise.all(
      classStudents.map((student) => cardRepository.listByStudent(schoolId, student.id)),
    );
    const rollRows = classStudents.map((student, index) => ({
      student,
      cardStatus: deriveCardStatus(cardsByStudent[index] ?? []),
    }));

    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title={greeting}
          description={
            signedInStaff?.advisoryGradeLevel && signedInStaff.advisorySection
              ? `Your advisory class, Grade ${signedInStaff.advisoryGradeLevel} – ${signedInStaff.advisorySection}.`
              : "Your advisory class."
          }
        />

        <AttendanceHero
          eyebrow="Your class today"
          subjectLabel="students are in school"
          counts={countByStatus(classStudents, classTaps, day)}
          flexible={day.flexible}
        />

        {/* items-start so each card sizes to its own content — without it
            the shorter card stretches to match the taller one, leaving a
            large empty area inside it. */}
        <div className="grid items-start gap-6 xl:grid-cols-[1.2fr_1fr]">
          <DashboardCard title="Class roll">
            <ClassRoll rows={rollRows} taps={classTaps} day={day} />
          </DashboardCard>
          <DashboardCard title="Live taps in your class">
            <LiveTapFeed taps={classTaps} students={classStudents} />
          </DashboardCard>
        </div>
      </div>
    );
  }

  const schoolId = session.schoolId;
  const linksSince = new Date(Date.parse(now) - NEW_LINKS_DAYS * 24 * 60 * 60_000).toISOString();
  // Open alerts come with their taps in one query (Step 57). The live feed
  // asks only about its own few taps' alerts, so a lost card shows whose it was.
  const [openAlerts, newLinks, feedAlerts] = await Promise.all([
    alertRepository.listOpen(schoolId, ALERTS_SHOWN),
    parentStudentLinkRepository.listRecentInSchool(schoolId, linksSince, NEW_LINKS_SHOWN),
    alertRepository.listForTaps(
      schoolId,
      recentFeedTaps(taps).map((tap) => tap.id),
    ),
  ]);
  const lostCardOwners = new Map(feedAlerts.map((alert) => [alert.tapId, alert.studentId]));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={session.role === "super_admin" ? `Viewing ${school?.name ?? "this school"}` : greeting}
        description={
          session.role === "super_admin"
            ? "You're seeing this school as a super admin."
            : "Here's who is in school right now."
        }
      />

      <AttendanceHero
        eyebrow="Today's attendance"
        subjectLabel="students are in school"
        counts={countByStatus(students, taps, day)}
        flexible={day.flexible}
      />

      {/* items-start so each card sizes to its own content — see the
          teacher branch above for why. */}
      <div className="grid items-start gap-6 xl:grid-cols-[1.2fr_1fr]">
        <DashboardCard title="Attendance by grade level">
          <GradeBreakdown rows={attendanceByGrade(students, taps, day)} />
        </DashboardCard>

        <div className="flex flex-col gap-6">
          <DashboardCard
            title="Needs attention"
            aside={
              <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                {openAlerts.total} open
              </span>
            }
          >
            <NeedsAttention alerts={openAlerts.alerts} students={students} today={day.date} />
          </DashboardCard>

          <DashboardCard
            title="New parent links"
            aside={
              <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                {newLinksLabel(newLinks.total)}
              </span>
            }
          >
            <NewParentLinks links={newLinks.links} />
          </DashboardCard>

          <DashboardCard
            title="Live taps"
            aside={
              // Principals and super admins only: this branch never renders for a teacher.
              <a
                href="/gate/display"
                target="_blank"
                rel="noopener"
                className="rounded-md text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                Open gate monitor
              </a>
            }
          >
            <LiveTapFeed taps={taps} students={students} lostCardOwners={lostCardOwners} />
          </DashboardCard>
        </div>
      </div>
    </div>
  );
}
