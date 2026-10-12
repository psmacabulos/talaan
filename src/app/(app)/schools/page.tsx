import { AccessDenied } from "@/components/app-shell/access-denied";
import { hasNavAccess } from "@/components/app-shell/nav-items";
import { schoolRepository, staffRepository, studentRepository } from "@/data/repositories";
import { SchoolsDirectory } from "@/features/schools/schools-directory";
import { requireSession } from "@/lib/session";

/**
 * Step 25's super-admin screen: every school on the platform, with an
 * add-school flow (logo upload included) and an "Open" that has the super
 * admin view that school, still as themselves (Step 50) — see
 * src/features/schools/actions.ts. Unlike the other (app) pages there's no
 * NoSchoolSelected guard here: the cross-school list is the point.
 */
export default async function SchoolsPage() {
  const session = await requireSession();

  if (!hasNavAccess(session.role, "schools")) {
    return <AccessDenied reason="Only a super admin manages schools across the platform." />;
  }

  const schools = await schoolRepository.list();
  const rows = await Promise.all(
    schools.map(async (school) => {
      const [students, staff] = await Promise.all([
        studentRepository.listBySchool(school.id),
        staffRepository.listBySchool(school.id),
      ]);
      return { school, studentCount: students.length, staffCount: staff.length };
    }),
  );

  return <SchoolsDirectory items={rows} />;
}
