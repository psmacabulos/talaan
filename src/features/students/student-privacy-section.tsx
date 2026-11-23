"use client";

import { useId, useRef, useState, useTransition } from "react";
import { Download, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { confirmationNameOf, isConfirmed } from "./privacy-confirm";
import { deleteStudentAction } from "./privacy-actions";
import type { Student } from "./types";

/**
 * The drawer's "Privacy" (Step 60.3): download what the school keeps about
 * this student, or delete it all. It sits inside the student form, but
 * nothing here is part of its Save: the buttons are `type="button"`, and
 * the dialog's own form stops its `submit` from reaching the drawer's
 * (React sends an event through a portal to the form it was opened from,
 * which would otherwise press "Save student").
 */
export function StudentPrivacySection({ student, onDeleted }: { student: Student; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const fieldId = useId();
  const errorId = `${fieldId}-error`;
  const name = confirmationNameOf(student);
  const downloadHref = `/students/${student.id}/export`;

  function setDialog(next: boolean) {
    if (isPending) return;
    setOpen(next);
    if (!next) {
      setTyped("");
      setError(null);
    }
  }

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await deleteStudentAction(student.id, typed);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      toast(`Deleted ${name} and everything kept about them`);
      onDeleted();
    });
  }

  return (
    <section aria-labelledby="student-privacy-heading" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 id="student-privacy-heading" className="font-heading text-sm font-semibold text-foreground">
          Privacy
        </h3>
        <p className="text-sm text-muted-foreground">
          Give {student.firstName}&apos;s guardian a copy of what the school keeps about them, or delete it all when
          they ask. Deleting can&apos;t be undone.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button asChild type="button" variant="outline" className="h-11 sm:h-8">
          <a href={downloadHref} download>
            <Download aria-hidden="true" />
            Download {student.firstName}&apos;s data
          </a>
        </Button>
        <Button
          ref={triggerRef}
          type="button"
          variant="outline"
          className="h-11 text-destructive hover:text-destructive sm:h-8"
          onClick={() => setDialog(true)}
        >
          <Trash2 aria-hidden="true" />
          Delete this student…
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setDialog}>
        <DialogContent
          showCloseButton={false}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>Delete {name}?</DialogTitle>
            <DialogDescription>
              This deletes {student.firstName}&apos;s record, photo, ID cards, every tap and alert, the notices sent
              about them, and their parents&apos; links to them. It can&apos;t be undone. Parent accounts, other
              students and the school&apos;s records of who changed what stay.
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Asked for a copy first?{" "}
            <a href={downloadHref} download className="font-medium text-primary underline-offset-4 hover:underline">
              Download {student.firstName}&apos;s data
            </a>
            .
          </p>

          <form
            noValidate
            onSubmit={(event) => {
              // Not the drawer's Save: see the note on this component.
              event.preventDefault();
              event.stopPropagation();
              if (isConfirmed(typed, student)) confirm();
            }}
            className="flex flex-col gap-2"
          >
            <Label htmlFor={fieldId}>
              Type <span className="font-semibold text-foreground">{name}</span> to confirm
            </Label>
            <Input
              id={fieldId}
              autoComplete="off"
              autoCapitalize="off"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              disabled={isPending}
            />
            {error ? (
              <p id={errorId} role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </form>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialog(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirm}
              disabled={isPending || !isConfirmed(typed, student)}
            >
              {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              {isPending ? "Deleting…" : "Delete everything"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
