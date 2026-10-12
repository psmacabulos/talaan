import { AccessDenied } from "@/components/app-shell/access-denied";
import { hasNavAccess } from "@/components/app-shell/nav-items";
import { PageHeader } from "@/components/page-header";
import { schoolRepository } from "@/data/repositories";
import { NoSchoolSelected } from "@/features/attendance/no-school-selected";
import { AppearanceSettingsForm } from "@/features/schools/appearance-settings-form";
import { AttendanceTimesForm } from "@/features/schools/attendance-times-form";
import { NotificationSettingsForm } from "@/features/schools/notification-settings-form";
import { requireSession } from "@/lib/session";

export default async function SettingsPage() {
  const session = await requireSession();

  if (!hasNavAccess(session.role, "settings")) {
    return (
      <AccessDenied reason="Teacher accounts don't change school settings — that needs a principal or super admin sign-in." />
    );
  }

  // Only a super admin can have no school: until they open one on the
  // Schools page (Step 50), there's no school to show.
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

      {school ? (
        <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-col gap-1">
            <h3 className="font-heading text-base font-semibold text-foreground">Appearance</h3>
            <p className="text-sm text-muted-foreground">
              Choose this school&apos;s color theme. Everyone at the school sees it once you save; light or dark mode
              stays each person&apos;s own choice.
            </p>
          </div>
          <AppearanceSettingsForm currentTheme={school.theme} />
        </section>
      ) : null}

      {school ? (
        <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-col gap-1">
            <h3 className="font-heading text-base font-semibold text-foreground">Attendance times</h3>
            <p className="text-sm text-muted-foreground">
              When a student counts as late, and when a student with no tap counts as absent, on school days at this
              school.
            </p>
          </div>
          <AttendanceTimesForm currentTimes={{ lateAfter: school.lateAfter, absentFrom: school.absentFrom }} />
        </section>
      ) : null}

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
