"use client";

import { IdCard, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StaffCompactList } from "./staff-compact-list";
import { StaffDrawer } from "./staff-drawer";
import { StaffTable } from "./staff-table";
import type { Staff } from "./types";

/**
 * The staff page's single interactive owner (Step 18), same shape as
 * `StudentsDirectory` — `page.tsx` stays a Server Component doing only
 * session/data fetching, and the "Invite staff" button and the drawer it
 * opens live here together so they share one piece of state.
 *
 * The table and the compact phone list (Step 27.6) are both rendered and swapped with
 * CSS at 768px rather than by measuring the screen in JavaScript, so the
 * server's HTML is already right for the device and nothing jumps on load.
 * `display: none` also hides the unused one from screen readers.
 */
export function StaffDirectory({ items, currentUserId }: { items: Staff[]; currentUserId: string }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        as="h2"
        title="Staff"
        description="Principals and teachers who can sign in to this school. They cannot see any other school."
        actions={
          // Just "Invite" on phones, so it fits beside the title (Step 27.7).
          <Button aria-label="Invite staff" onClick={() => setDrawerOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Invite<span className="hidden sm:inline">staff</span>
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState icon={IdCard} title="No staff yet" description="Invite a principal or teacher to get started." />
      ) : (
        <>
          <div className="md:hidden">
            <StaffCompactList items={items} currentUserId={currentUserId} />
          </div>
          <div className="hidden md:block">
            <StaffTable items={items} currentUserId={currentUserId} />
          </div>
        </>
      )}

      <StaffDrawer open={drawerOpen} onOpenChange={setDrawerOpen} onSuccess={() => setDrawerOpen(false)} />
    </div>
  );
}
