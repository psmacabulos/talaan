"use client";

import { IdCard, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StaffDrawer } from "./staff-drawer";
import { StaffTable } from "./staff-table";
import type { Staff } from "./types";

/**
 * The staff page's single interactive owner (Step 18), same shape as
 * `StudentsDirectory` — `page.tsx` stays a Server Component doing only
 * session/data fetching, and the "Invite staff" button and the drawer it
 * opens live here together so they share one piece of state.
 */
export function StaffDirectory({ items }: { items: Staff[] }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        as="h2"
        title="Staff"
        description="Principals and teachers who can sign in to this school. They cannot see any other school."
        actions={
          <Button onClick={() => setDrawerOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Invite staff
          </Button>
        }
      />

      {items.length === 0 ? (
        <EmptyState icon={IdCard} title="No staff yet" description="Invite a principal or teacher to get started." />
      ) : (
        <StaffTable items={items} />
      )}

      <StaffDrawer open={drawerOpen} onOpenChange={setDrawerOpen} onSuccess={() => setDrawerOpen(false)} />
    </div>
  );
}
