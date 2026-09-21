import { getSession } from "@/lib/session";
import { hasNavAccess } from "@/components/app-shell/nav-items";
import { AccessDenied } from "@/components/app-shell/access-denied";
import { PageHeader } from "@/components/page-header";

export default async function StationPage() {
  const session = await getSession();

  if (!hasNavAccess(session.role, "station")) {
    return (
      <AccessDenied reason="Teacher accounts don't run the tap station — that needs a principal or super admin sign-in." />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader as="h2" title="Tap station" description="A kiosk screen for students to tap in." />
      <p className="max-w-prose text-sm text-muted-foreground">
        The ready, success, duplicate, lost-card and unknown-card states are built in Step 19.
      </p>
    </div>
  );
}
