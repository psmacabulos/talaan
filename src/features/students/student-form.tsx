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
import { createStudent, updateStudent } from "./actions";
import { ageInYears } from "./age";
import { CardBox } from "./card-box";
import { STUDENT_FORM_MAX_BIRTH_DATE, studentFormSchema } from "./schemas";
import type { Card, GradeLevel, Student, StudentFormInput, StudentFormValues } from "./types";

const GRADE_LEVELS: readonly GradeLevel[] = [7, 8, 9, 10, 11, 12];

function emptyValues(): StudentFormValues {
  return {
    firstName: "",
    middleName: undefined,
    lastName: "",
    birthDate: "",
    lrn: undefined,
    gradeLevel: 7,
    section: "",
    guardianName: "",
    guardianMobile: "",
  };
}

function valuesFrom(student: Student): StudentFormValues {
  return {
    firstName: student.firstName,
    middleName: student.middleName,
    lastName: student.lastName,
    birthDate: student.birthDate,
    lrn: student.lrn,
    gradeLevel: student.gradeLevel,
    section: student.section,
    guardianName: student.guardianName,
    guardianMobile: student.guardianMobile,
  };
}

/**
 * The add/edit drawer's form body (Step 15). `student-drawer.tsx` only
 * mounts this while open, so `defaultValues` are read fresh each time —
 * no reset effect needed when switching between "add" and "edit an
 * existing student". Client validation is `studentFormSchema`
 * (schemas.ts); the server action re-validates the same schema and this
 * form also surfaces whatever it reports back (CLAUDE.md: "validated on
 * both sides").
 */
export function StudentForm({
  student,
  cards,
  onSuccess,
  onCancel,
}: {
  student?: Student;
  /** Only meaningful when editing (`student` set) — a brand-new student has nothing to link a card to yet. */
  cards?: Card[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const isEditing = Boolean(student);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<StudentFormValues, unknown, StudentFormInput>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: student ? valuesFrom(student) : emptyValues(),
  });

  const birthDate = useWatch({ control, name: "birthDate" });
  const busy = isPending || isSubmitting;

  function onSubmit(data: StudentFormInput) {
    startTransition(async () => {
      const result = isEditing && student ? await updateStudent(student.id, data) : await createStudent(data);

      if (result.ok) {
        toast(
          isEditing
            ? `Saved changes to ${data.firstName} ${data.lastName}`
            : `${data.firstName} ${data.lastName} was added`,
        );
        onSuccess();
        return;
      }

      if (result.fieldErrors) {
        for (const [field, message] of Object.entries(result.fieldErrors) as [keyof StudentFormInput, string][]) {
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
          <legend className="mb-3 font-heading text-sm font-semibold text-foreground">Learner</legend>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="student-first-name">First name</Label>
              <Input
                id="student-first-name"
                aria-invalid={errors.firstName ? true : undefined}
                aria-describedby={errors.firstName ? "student-first-name-error" : undefined}
                {...register("firstName")}
              />
              {errors.firstName && (
                <p id="student-first-name-error" className="text-sm text-destructive">
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="student-middle-name">Middle name</Label>
              <Input id="student-middle-name" {...register("middleName")} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="student-last-name">Surname</Label>
            <Input
              id="student-last-name"
              aria-invalid={errors.lastName ? true : undefined}
              aria-describedby={errors.lastName ? "student-last-name-error" : undefined}
              {...register("lastName")}
            />
            {errors.lastName && (
              <p id="student-last-name-error" className="text-sm text-destructive">
                {errors.lastName.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="student-birth-date">Birth date</Label>
              <Input
                id="student-birth-date"
                type="date"
                max={STUDENT_FORM_MAX_BIRTH_DATE}
                aria-invalid={errors.birthDate ? true : undefined}
                aria-describedby="student-birth-date-hint"
                {...register("birthDate")}
              />
              <p
                id="student-birth-date-hint"
                className={errors.birthDate ? "text-sm text-destructive" : "text-sm text-muted-foreground"}
              >
                {errors.birthDate
                  ? errors.birthDate.message
                  : birthDate
                    ? `Age ${ageInYears(birthDate)}`
                    : "Age is worked out from the birth date"}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="student-lrn">LRN (optional)</Label>
              <Input
                id="student-lrn"
                inputMode="numeric"
                maxLength={12}
                aria-invalid={errors.lrn ? true : undefined}
                aria-describedby={errors.lrn ? "student-lrn-error" : undefined}
                {...register("lrn")}
              />
              {errors.lrn && (
                <p id="student-lrn-error" className="text-sm text-destructive">
                  {errors.lrn.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="student-grade">Grade</Label>
              <Controller
                control={control}
                name="gradeLevel"
                render={({ field }) => (
                  <Select value={String(field.value)} onValueChange={(value) => field.onChange(Number(value))}>
                    <SelectTrigger id="student-grade" className="w-full">
                      <SelectValue />
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
              <Label htmlFor="student-section">Section</Label>
              <Input
                id="student-section"
                aria-invalid={errors.section ? true : undefined}
                aria-describedby={errors.section ? "student-section-error" : undefined}
                {...register("section")}
              />
              {errors.section && (
                <p id="student-section-error" className="text-sm text-destructive">
                  {errors.section.message}
                </p>
              )}
            </div>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-3 font-heading text-sm font-semibold text-foreground">Parent or guardian</legend>

          <div className="flex flex-col gap-2">
            <Label htmlFor="student-guardian-name">Name</Label>
            <Input
              id="student-guardian-name"
              aria-invalid={errors.guardianName ? true : undefined}
              aria-describedby={errors.guardianName ? "student-guardian-name-error" : undefined}
              {...register("guardianName")}
            />
            {errors.guardianName && (
              <p id="student-guardian-name-error" className="text-sm text-destructive">
                {errors.guardianName.message}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="student-guardian-mobile">Mobile number for alerts</Label>
            <Input
              id="student-guardian-mobile"
              type="tel"
              placeholder="09171234567"
              aria-invalid={errors.guardianMobile ? true : undefined}
              aria-describedby={errors.guardianMobile ? "student-guardian-mobile-error" : undefined}
              {...register("guardianMobile")}
            />
            {errors.guardianMobile && (
              <p id="student-guardian-mobile-error" className="text-sm text-destructive">
                {errors.guardianMobile.message}
              </p>
            )}
          </div>
        </fieldset>

        {student ? <CardBox studentId={student.id} cards={cards ?? []} /> : null}
      </div>

      <SheetFooter className="flex-row justify-end border-t border-border [&>button]:h-11 [&>button]:flex-1 sm:[&>button]:h-8 sm:[&>button]:flex-none">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Saving…
            </>
          ) : isEditing ? (
            "Save student"
          ) : (
            "Add student"
          )}
        </Button>
      </SheetFooter>
    </form>
  );
}
