import { AccessDenied } from "@/components/app-shell/access-denied";
import { hasNavAccess } from "@/components/app-shell/nav-items";
import { PageHeader } from "@/components/page-header";
import { schoolRepository } from "@/data/repositories";
import { NoSchoolSelected } from "@/features/attendance/no-school-selected";
import { NotificationSettingsForm } from "@/features/schools/notification-settings-form";
import { getSession } from "@/lib/session";

export default async function SettingsPage() {
  const session = await getSession();

  if (!hasNavAccess(session.role, "settings")) {
    return (
      <AccessDenied reason="Teacher accounts don't change school settings — that needs a principal or super admin sign-in." />
    );
  }

  // Same guard as every other school-scoped page: only a super admin can be
  // school-less, and there's no "view school X" mechanism until Step 25.
  if (!session.schoolId) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader as="h2" title="Settings" description="School-wide settings." />
        <NoSchoolSelected subject="settings" />
      </div>
    );
  }

  const school = await schoolRepository.getById(session.schoolId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        as="h2"
        title="Settings"
        description={school ? `School-wide settings for ${school.name}.` : "School-wide settings."}
      />

      <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-1">
          <h3 className="font-heading text-base font-semibold text-foreground">Notifications</h3>
          <p className="text-sm text-muted-foreground">
            Choose when parents get a tap notification for a student at this school.
          </p>
        </div>

        {school ? (
          <NotificationSettingsForm currentPreference={school.notificationPreference} />
        ) : (
          <NoSchoolSelected subject="settings" />
        )}
      </section>
    </div>
  );
}
