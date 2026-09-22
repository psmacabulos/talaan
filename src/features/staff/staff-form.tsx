"use client";

import { useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SheetFooter } from "@/components/ui/sheet";
import type { GradeLevel } from "@/features/students/types";
import { inviteStaff } from "./actions";
import { staffFormSchema } from "./schemas";
import type { StaffFormInput, StaffFormValues, StaffInviteRole } from "./types";

const GRADE_LEVELS: readonly GradeLevel[] = [7, 8, 9, 10, 11, 12];

const ROLE_LABEL: Record<StaffInviteRole, string> = {
  principal: "Principal",
  teacher: "Teacher",
};

function emptyValues(): StaffFormValues {
  return {
    firstName: "",
    lastName: "",
    email: "",
    role: "teacher",
    advisoryGradeLevel: undefined,
    advisorySection: undefined,
  };
}

/**
 * Step 18's invite drawer body. Unlike `StudentForm` this is invite-only —
 * no editing an existing staff member yet — so there's no `isEditing`
 * branch and no `defaultValues` derived from a record; every open starts
 * from a blank form. Client validation is `staffFormSchema`; the server
 * action re-validates the same schema (CLAUDE.md: "validated on both
 * sides").
 */
export function StaffForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<StaffFormValues, unknown, StaffFormInput>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: emptyValues(),
  });

  const role = useWatch({ control, name: "role" });
  const busy = isPending || isSubmitting;

  function onSubmit(data: StaffFormInput) {
    startTransition(async () => {
      const result = await inviteStaff(data);

      if (result.ok) {
        toast(`${data.firstName} ${data.lastName} was invited`);
        onSuccess();
        return;
      }

      if (result.fieldErrors) {
        for (const [field, message] of Object.entries(result.fieldErrors) as [keyof StaffFormInput, string][]) {
          setError(field, { message });
        }
      }
      if (result.formError) {
        toast.error(result.formError);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
        <fieldset className="flex flex-col gap-4">
          <legend className="font-heading text-sm font-semibold text-foreground">Staff details</legend>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="staff-first-name">First name</Label>
              <Input
                id="staff-first-name"
                aria-invalid={errors.firstName ? true : undefined}
                aria-describedby={errors.firstName ? "staff-first-name-error" : undefined}
                {...register("firstName")}
              />
              {errors.firstName && (
                <p id="staff-first-name-error" className="text-sm text-destructive">
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="staff-last-name">Surname</Label>
              <Input
                id="staff-last-name"
                aria-invalid={errors.lastName ? true : undefined}
                aria-describedby={errors.lastName ? "staff-last-name-error" : undefined}
                {...register("lastName")}
              />
              {errors.lastName && (
                <p id="staff-last-name-error" className="text-sm text-destructive">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="staff-email">Email</Label>
            <Input
              id="staff-email"
              type="email"
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? "staff-email-error" : undefined}
              {...register("email")}
            />
            {errors.email && (
              <p id="staff-email-error" className="text-sm text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="staff-role">Role</Label>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="staff-role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ROLE_LABEL) as StaffInviteRole[]).map((value) => (
                      <SelectItem key={value} value={value}>
                        {ROLE_LABEL[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </fieldset>

        {role === "teacher" ? (
          <fieldset className="flex flex-col gap-4">
            <legend className="font-heading text-sm font-semibold text-foreground">Advisory class (optional)</legend>
            <p className="text-sm text-muted-foreground">
              Can be assigned later instead — a teacher with no advisory class yet just won&apos;t see one on their
              dashboard.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="staff-advisory-grade">Grade</Label>
                <Controller
                  control={control}
                  name="advisoryGradeLevel"
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : ""}
                      onValueChange={(value) => field.onChange(Number(value))}
                    >
                      <SelectTrigger id="staff-advisory-grade" className="w-full">
                        <SelectValue placeholder="Select a grade" />
                      </SelectTrigger>
                      <SelectContent>
                        {GRADE_LEVELS.map((grade) => (
                          <SelectItem key={grade} value={String(grade)}>
                            Grade {grade}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="staff-advisory-section">Section</Label>
                <Input id="staff-advisory-section" {...register("advisorySection")} />
              </div>
            </div>
          </fieldset>
        ) : null}
      </div>

      <SheetFooter className="flex-row justify-end border-t border-border">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Inviting…
            </>
          ) : (
            "Invite staff"
          )}
        </Button>
      </SheetFooter>
    </form>
  );
}
