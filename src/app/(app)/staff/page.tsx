import { AccessDenied } from "@/components/app-shell/access-denied";
import { hasNavAccess } from "@/components/app-shell/nav-items";
import { PageHeader } from "@/components/page-header";
import { staffRepository } from "@/data/repositories";
import { NoSchoolSelected } from "@/features/attendance/no-school-selected";
import { StaffDirectory } from "@/features/staff/staff-directory";
import { requireSession } from "@/lib/session";

export default async function StaffPage() {
  const session = await requireSession();

  if (!hasNavAccess(session.role, "staff")) {
    return (
      <AccessDenied reason="Teacher accounts don't manage staff at this school — that needs a principal or super admin sign-in." />
    );
  }

  // Only a super admin can have no school: until they open one on the
  // Schools page (Step 50), there's no school to show.
  if (!session.schoolId) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Staff" description="Principals and teachers who can sign in to this school." />
        <NoSchoolSelected subject="staff list" />
      </div>
    );
  }

  const staff = await staffRepository.listBySchool(session.schoolId);

  return <StaffDirectory items={staff} currentUserId={session.userId} />;
}
