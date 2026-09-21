import { getSession } from "@/lib/session";
import { hasNavAccess } from "@/components/app-shell/nav-items";
import { AccessDenied } from "@/components/app-shell/access-denied";
import { PageHeader } from "@/components/page-header";

export default async function SchoolsPage() {
  const session = await getSession();

  if (!hasNavAccess(session.role, "schools")) {
    return (
      <AccessDenied reason="Only a super admin manages schools across the platform." />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        as="h2"
        title="Schools"
        description="Each school has its own logo, colors and accounts."
      />
      <p className="max-w-prose text-sm text-muted-foreground">
        The schools list and add-school flow, with logo upload and a live theme preview, are
        built in Step 20.
      </p>
    </div>
  );
}
