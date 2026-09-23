"use client";

import { Plus, School as SchoolIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        as="h2"
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
        <EmptyState
          icon={SchoolIcon}
          title="No schools yet"
          description="Add the first school to get started."
        />
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

      <SchoolDrawer open={drawerOpen} onOpenChange={setDrawerOpen} onSuccess={() => setDrawerOpen(false)} />
    </div>
  );
}
