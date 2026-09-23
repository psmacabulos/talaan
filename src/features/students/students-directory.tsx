"use client";

import { Plus, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import type { Tap } from "@/features/attendance/types";
import type { StudentListParams } from "./search-params";
import type { StudentRow } from "./search-students";
import { StudentDrawer } from "./student-drawer";
import { StudentsCardList } from "./students-card-list";
import { StudentsPagination } from "./students-pagination";
import { StudentsTable } from "./students-table";
import { StudentsToolbar } from "./students-toolbar";
import type { Card, Student } from "./types";

/**
 * The students page's single interactive owner (Step 15). `page.tsx` stays
 * a Server Component doing only session/data fetching; everything that
 * needs client state — the "Add student" button, row clicks, and the
 * add/edit drawer they both open — lives here so the header button and
 * the table can share one piece of drawer state.
 *
 * Below 768px the table becomes cards (Step 27.7). Both are rendered and
 * CSS shows one, the same as the staff page (docs/RESPONSIVE-LISTS.md).
 */
export function StudentsDirectory({
  title,
  description,
  params,
  items,
  total,
  taps,
  showGradeFilter,
  canEdit,
}: {
  title: string;
  description: string;
  params: StudentListParams;
  items: StudentRow[];
  total: number;
  taps: Tap[];
  showGradeFilter: boolean;
  canEdit: boolean;
}) {
  const [drawer, setDrawer] = useState<{ open: boolean; student?: Student; cards: Card[] }>({
    open: false,
    cards: [],
  });
  const openStudent = canEdit
    ? (row: StudentRow) => setDrawer({ open: true, student: row.student, cards: row.cards })
    : undefined;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        as="h2"
        title={title}
        description={description}
        actions={
          canEdit ? (
            // Just "Add" on phones, so the button fits beside the title; the
            // full name stays the accessible name everywhere.
            <Button
              aria-label="Add student"
              onClick={() => setDrawer({ open: true, student: undefined, cards: [] })}
            >
              <Plus className="size-4" aria-hidden="true" />
              Add<span className="hidden sm:inline">student</span>
            </Button>
          ) : undefined
        }
      />

      <StudentsToolbar params={params} showGradeFilter={showGradeFilter} />

      {total === 0 ? (
        <EmptyState icon={Users} title="No students match" description="Try a different name, grade or card status." />
      ) : (
        <>
          <div className="md:hidden">
            <StudentsCardList
              items={items}
              taps={taps}
              subtitle={showGradeFilter ? "grade" : "time-in"}
              onCardClick={openStudent}
            />
          </div>
          <div className="hidden md:block">
            <StudentsTable items={items} taps={taps} params={params} onRowClick={openStudent} />
          </div>
          <StudentsPagination params={params} total={total} />
        </>
      )}

      <StudentDrawer
        open={drawer.open}
        student={drawer.student}
        cards={drawer.cards}
        onOpenChange={(open) => setDrawer((current) => ({ ...current, open }))}
        onSuccess={() => setDrawer({ open: false, cards: [] })}
      />
    </div>
  );
}
