import { AccessDenied } from "@/components/app-shell/access-denied";
import { hasNavAccess } from "@/components/app-shell/nav-items";
import { PageHeader } from "@/components/page-header";
import { staffRepository } from "@/data/repositories";
import { NoSchoolSelected } from "@/features/attendance/no-school-selected";
import { StaffDirectory } from "@/features/staff/staff-directory";
import { getSession } from "@/lib/session";

export default async function StaffPage() {
  const session = await getSession();

  if (!hasNavAccess(session.role, "staff")) {
    return (
      <AccessDenied reason="Teacher accounts don't manage staff at this school — that needs a principal or super admin sign-in." />
    );
  }

  // Same guard as the dashboard, Students and Attendance pages: only a
  // super admin can be school-less, and there's no "view school X"
  // mechanism until Step 25.
  if (!session.schoolId) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          as="h2"
          title="Staff"
          description="Principals and teachers who can sign in to this school."
        />
        <NoSchoolSelected subject="staff list" />
      </div>
    );
  }

  const staff = await staffRepository.listBySchool(session.schoolId);

  return <StaffDirectory items={staff} currentUserId={session.userId} />;
}
