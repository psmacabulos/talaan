import { AccessDenied } from "@/components/app-shell/access-denied";
import { hasNavAccess } from "@/components/app-shell/nav-items";
import { PageHeader } from "@/components/page-header";
import { cardRepository, schoolRepository, studentRepository, tapRepository } from "@/data/repositories";
import { NoSchoolSelected } from "@/features/attendance/no-school-selected";
import { DEFAULT_ATTENDANCE_TIMES } from "@/features/attendance/status";
import { TapStationKiosk } from "@/features/station/tap-station-kiosk";
import { getNow, isDemoClock } from "@/lib/clock";
import { schoolDateOf } from "@/lib/school-time";
import { requireSession } from "@/lib/session";

export default async function StationPage() {
  const session = await requireSession();

  if (!hasNavAccess(session.role, "station")) {
    return (
      <AccessDenied reason="Teacher accounts don't run the tap station — that needs a principal or super admin sign-in." />
    );
  }

  // Only a super admin can have no school: until they open one on the
  // Schools page (Step 50), there's no school to show.
  if (!session.schoolId) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader as="h2" title="Tap station" description="A kiosk screen for students to tap in." />
        <NoSchoolSelected subject="tap station" />
      </div>
    );
  }

  const [school, students] = await Promise.all([
    schoolRepository.getById(session.schoolId),
    studentRepository.listBySchool(session.schoolId),
  ]);
  const now = getNow();
  const taps = await tapRepository.listBySchoolOnDate(session.schoolId, schoolDateOf(now));
  // No school-wide "list every card" method exists (Step 16 only ever
  // needed one student's own history) — same per-student fetch-and-flatten
  // already used by search-students.ts and the Step 17 attendance page.
  const schoolId = session.schoolId;
  const cardsByStudent = await Promise.all(
    students.map((student) => cardRepository.listByStudent(schoolId, student.id)),
  );
  const cards = cardsByStudent.flat();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader as="h2" title="Tap station" description="This is what a tablet or phone at the gate shows." />
      <TapStationKiosk
        schoolId={session.schoolId}
        students={students}
        taps={taps}
        cards={cards}
        attendanceTimes={school ?? DEFAULT_ATTENDANCE_TIMES}
        pinnedNow={isDemoClock() ? now : null}
      />
    </div>
  );
}
