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
import { StudentsPagination } from "./students-pagination";
import { StudentsTable } from "./students-table";
import { StudentsToolbar } from "./students-toolbar";
import type { Student } from "./types";

/**
 * The students page's single interactive owner (Step 15). `page.tsx` stays
 * a Server Component doing only session/data fetching; everything that
 * needs client state — the "Add student" button, row clicks, and the
 * add/edit drawer they both open — lives here so the header button and
 * the table can share one piece of drawer state.
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
  const [drawer, setDrawer] = useState<{ open: boolean; student?: Student }>({ open: false });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        as="h2"
        title={title}
        description={description}
        actions={
          canEdit ? (
            <Button onClick={() => setDrawer({ open: true, student: undefined })}>
              <Plus className="size-4" aria-hidden="true" />
              Add student
            </Button>
          ) : undefined
        }
      />

      <StudentsToolbar params={params} showGradeFilter={showGradeFilter} />

      {total === 0 ? (
        <EmptyState icon={Users} title="No students match" description="Try a different name, grade or card status." />
      ) : (
        <>
          <StudentsTable
            items={items}
            taps={taps}
            params={params}
            onRowClick={canEdit ? (student) => setDrawer({ open: true, student }) : undefined}
          />
          <StudentsPagination params={params} total={total} />
        </>
      )}

      <StudentDrawer
        open={drawer.open}
        student={drawer.student}
        onOpenChange={(open) => setDrawer((current) => ({ ...current, open }))}
        onSuccess={() => setDrawer({ open: false })}
      />
    </div>
  );
}
