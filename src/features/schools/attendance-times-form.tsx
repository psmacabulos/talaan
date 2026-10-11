"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AttendanceTimes } from "@/features/attendance/status";
import { updateAttendanceTimes } from "./actions";
import { attendanceTimesSchema } from "./schemas";

const FIELDS: { name: keyof AttendanceTimes; label: string; hint: string }[] = [
  { name: "lateAfter", label: "Late after", hint: "A tap after this time shows as late." },
  { name: "absentFrom", label: "Absent from", hint: "No tap by this time shows as absent." },
];

/**
 * Settings > Attendance times (Step 44.5). Two `<input type="time">`
 * fields: the browser shows them in its own 12- or 24-hour style, but the
 * value is always "HH:MM" in 24-hour form, which is exactly what
 * `attendanceTimesSchema` and the database store. The server action
 * re-validates the same schema (CLAUDE.md: "validated on both sides").
 */
export function AttendanceTimesForm({ currentTimes }: { currentTimes: AttendanceTimes }) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<AttendanceTimes>({
    resolver: zodResolver(attendanceTimesSchema),
    defaultValues: currentTimes,
  });
  const busy = isPending || isSubmitting;

  function onSubmit(data: AttendanceTimes) {
    startTransition(async () => {
      const result = await updateAttendanceTimes(data);

      if (result.ok) {
        // The saved times become the new starting point, so Save turns
        // off again until something else changes.
        reset(data);
        toast("Attendance times saved.");
        return;
      }

      if (result.fieldErrors) {
        for (const [field, message] of Object.entries(result.fieldErrors) as [keyof AttendanceTimes, string][]) {
          setError(field, { message });
        }
      }
      if (result.formError) {
        toast.error(result.formError);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((field) => {
          const error = errors[field.name]?.message;
          const inputId = `attendance-${field.name}`;
          return (
            <div key={field.name} className="flex flex-col gap-2">
              <Label htmlFor={inputId}>{field.label}</Label>
              <Input
                id={inputId}
                type="time"
                className="sm:max-w-48"
                aria-invalid={error ? true : undefined}
                aria-describedby={`${inputId}-hint${error ? ` ${inputId}-error` : ""}`}
                {...register(field.name)}
              />
              <p id={`${inputId}-hint`} className="text-sm text-muted-foreground">
                {field.hint}
              </p>
              {error && (
                <p id={`${inputId}-error`} className="text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <div>
        <Button type="submit" disabled={busy || !isDirty}>
          {busy ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
