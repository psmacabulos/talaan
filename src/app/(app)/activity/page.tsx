import { AccessDenied } from "@/components/app-shell/access-denied";
import { hasNavAccess } from "@/components/app-shell/nav-items";
import { PageHeader } from "@/components/page-header";
import { NoSchoolSelected } from "@/features/attendance/no-school-selected";
import { ActivityList } from "@/features/audit/activity-list";
import { parseActivityParams } from "@/features/audit/search-params";
import { requireSession } from "@/lib/session";
import { listActivity } from "@/services/audit/list-activity";

const TITLE = "Activity";
const DESCRIPTION = "Who added or changed students, ID cards, staff and parent access. Kept for two years.";

/**
 * The school's activity log (Step 60.1), for principals and super admins.
 * The school is always the session's own, never the address's, and the
 * role is checked here, not only by hiding the menu item.
 */
export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireSession();

  if (!hasNavAccess(session.role, "activity")) {
    return (
      <AccessDenied reason="Teacher accounts can't see the activity log — that needs a principal or super admin sign-in." />
    );
  }

  // Only a super admin can have no school, until they open one on the Schools page.
  if (!session.schoolId) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={TITLE} description={DESCRIPTION} />
        <NoSchoolSelected subject="activity log" />
      </div>
    );
  }

  const params = parseActivityParams(await searchParams);
  const page = await listActivity(session.schoolId, params);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={TITLE} description={DESCRIPTION} />
      <ActivityList page={page} group={params.group} isFirstPage={params.before === null} />
    </div>
  );
}
