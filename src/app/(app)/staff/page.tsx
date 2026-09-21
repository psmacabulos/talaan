import { IdCard } from "lucide-react";
import { getSession } from "@/lib/session";
import { hasNavAccess } from "@/components/app-shell/nav-items";
import { AccessDenied } from "@/components/app-shell/access-denied";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export default async function StaffPage() {
  const session = await getSession();

  if (!hasNavAccess(session.role, "staff")) {
    return (
      <AccessDenied reason="Teacher accounts don't manage staff at this school — that needs a principal or super admin sign-in." />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        as="h2"
        title="Staff"
        description="Principals and teachers who can sign in to this school."
      />
      <EmptyState
        icon={IdCard}
        title="Not built yet"
        description="The staff list and invite drawer are built in Step 18."
      />
    </div>
  );
}
