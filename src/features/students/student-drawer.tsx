"use client";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StudentForm } from "./student-form";
import type { Card, Student } from "./types";

/**
 * Thin Sheet chrome around StudentForm (Step 15). Only renders the form
 * while `open` is true, so it mounts fresh — with the right
 * `defaultValues` — every time it's opened, whether that's "Add student"
 * (`student` undefined) or a row click (`student` set).
 */
export function StudentDrawer({
  open,
  student,
  cards,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  student?: Student;
  /** That student's card history — ignored when `student` is undefined (a brand-new, not-yet-saved student has nothing to link a card to). */
  cards: Card[];
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const isEditing = Boolean(student);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader className="border-b border-border">
          <SheetTitle>{isEditing ? "Edit student" : "Add student"}</SheetTitle>
          <SheetDescription>
            {isEditing ? "Update this learner's details." : "Add a new learner to this school."}
          </SheetDescription>
        </SheetHeader>
        {open ? (
          <StudentForm
            key={student?.id ?? "new"}
            student={student}
            cards={cards}
            onSuccess={onSuccess}
            onCancel={() => onOpenChange(false)}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
