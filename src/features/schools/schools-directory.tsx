"use client";

import { Plus, School as SchoolIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import type { SignInLink } from "@/features/staff/sign-in-link";
import { SignInLinkDialog } from "@/features/staff/sign-in-link-dialog";
import { SchoolDrawer } from "./school-drawer";
import { SchoolsCardList } from "./schools-card-list";
import { SchoolsTable } from "./schools-table";
import type { SchoolRow } from "./types";

/**
 * The schools page's single interactive owner (Step 25), same shape as
 * `StaffDirectory` — `page.tsx` stays a Server Component doing only
 * session/data fetching, and the "Add school" button and the drawer it
 * opens live here together so they share one piece of state.
 */
export function SchoolsDirectory({ items }: { items: SchoolRow[] }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  // The new principal's set-password link, shown once the drawer closes (Step 50.5).
  const [principalLink, setPrincipalLink] = useState<SignInLink | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Schools"
        description="Each school has its own logo, colors and accounts. Open one to see it the way its principal does."
        actions={
          // Just "Add" on phones, so it fits beside the title (Step 27.7).
          <Button aria-label="Add school" onClick={() => setDrawerOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Add<span className="hidden sm:inline">school</span>
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState icon={SchoolIcon} title="No schools yet" description="Add the first school to get started." />
      ) : (
        // Both views render and CSS shows one, so the server's HTML is right
        // for every screen from the first paint (docs/RESPONSIVE-LISTS.md).
        <>
          <div className="md:hidden">
            <SchoolsCardList items={items} />
          </div>
          <div className="hidden md:block">
            <SchoolsTable items={items} />
          </div>
        </>
      )}

      <SchoolDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onSuccess={(link) => {
          setDrawerOpen(false);
          setPrincipalLink(link);
        }}
      />
      <SignInLinkDialog link={principalLink} onClose={() => setPrincipalLink(null)} />
    </div>
  );
}
