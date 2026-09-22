import { AccessDenied } from "@/components/app-shell/access-denied";
import { hasNavAccess } from "@/components/app-shell/nav-items";
import { PageHeader } from "@/components/page-header";
import { cardRepository, studentRepository, tapRepository } from "@/data/repositories";
import { NoSchoolSelected } from "@/features/attendance/no-school-selected";
import { TapStationKiosk } from "@/features/station/tap-station-kiosk";
import { getSession } from "@/lib/session";

export default async function StationPage() {
  const session = await getSession();

  if (!hasNavAccess(session.role, "station")) {
    return (
      <AccessDenied reason="Teacher accounts don't run the tap station — that needs a principal or super admin sign-in." />
    );
  }

  // Same guard as the dashboard, Students, Attendance and Staff pages: only
  // a super admin can be school-less, and there's no "view school X"
  // mechanism until Step 25.
  if (!session.schoolId) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader as="h2" title="Tap station" description="A kiosk screen for students to tap in." />
        <NoSchoolSelected subject="tap station" />
      </div>
    );
  }

  const students = await studentRepository.listBySchool(session.schoolId);
  const taps = await tapRepository.listBySchool(session.schoolId);
  // No school-wide "list every card" method exists (Step 16 only ever
  // needed one student's own history) — same per-student fetch-and-flatten
  // already used by search-students.ts and the Step 17 attendance page.
  const cardsByStudent = await Promise.all(students.map((student) => cardRepository.listByStudent(student.id)));
  const cards = cardsByStudent.flat();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        as="h2"
        title="Tap station"
        description="This is what a tablet or phone at the gate shows."
      />
      <TapStationKiosk schoolId={session.schoolId} students={students} taps={taps} cards={cards} />
    </div>
  );
}
