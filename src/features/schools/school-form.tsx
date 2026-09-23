"use client";

import { useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SheetFooter } from "@/components/ui/sheet";
import { presetToScopedCss } from "@/lib/theme/apply-preset";
import { getThemePreset } from "@/lib/theme/presets";
import { createSchool } from "./actions";
import { LogoUploader } from "./logo-uploader";
import { PresetPicker } from "./preset-picker";
import { SchoolLogo } from "./school-logo";
import { createSchoolSchema } from "./schemas";
import type { CreateSchoolFormInput, CreateSchoolFormValues } from "./types";

// The live preview's scope: its own tiny copy of the sidebar header,
// recolored to whichever preset the form has selected right now via
// presetToScopedCss (same mechanism as the preset-picker swatches and the
// design-system page) — so "what will this school look like" is answered
// before anything is saved.
const PREVIEW_SELECTOR = "[data-school-form-preview]";

function emptyValues(): CreateSchoolFormValues {
  return {
    name: "",
    principalFirstName: "",
    principalLastName: "",
    principalEmail: "",
    presetId: "school",
    logoUrl: undefined,
  };
}

/**
 * Step 25's add-school drawer body, same shape as `StaffForm`: create-only,
 * blank on every open, client validation by `createSchoolSchema`, and the
 * server action re-validates the same schema (CLAUDE.md: "validated on
 * both sides"). The form also collects the principal's name and email so
 * `createSchool` can create their invited account alongside the school.
 */
export function SchoolForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setValue,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateSchoolFormValues, unknown, CreateSchoolFormInput>({
    resolver: zodResolver(createSchoolSchema),
    defaultValues: emptyValues(),
  });

  const name = useWatch({ control, name: "name" });
  const presetId = useWatch({ control, name: "presetId" });
  const logoUrl = useWatch({ control, name: "logoUrl" });
  const busy = isPending || isSubmitting;

  const previewCss = presetToScopedCss(getThemePreset(presetId), PREVIEW_SELECTOR);
  const previewName = name.trim() || "Your school";

  function onSubmit(data: CreateSchoolFormInput) {
    startTransition(async () => {
      const result = await createSchool(data);

      if (result.ok) {
        toast(`${data.name} was added`);
        onSuccess();
        return;
      }

      if (result.fieldErrors) {
        for (const [field, message] of Object.entries(result.fieldErrors) as [
          keyof CreateSchoolFormInput,
          string,
        ][]) {
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
      {/* Raw, hardcoded CSS text (never user input) — dangerouslySetInnerHTML
          is used so the string is set verbatim, not HTML-escaped. */}
      <style dangerouslySetInnerHTML={{ __html: previewCss }} />
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">Live preview</p>
          <div data-school-form-preview className="rounded-lg border border-border bg-background p-3">
            <div className="flex items-center gap-3">
              <SchoolLogo name={previewName} logoUrl={logoUrl} className="size-10" />
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-heading text-sm font-semibold text-foreground">
                  {previewName}
                </span>
                <span className="text-xs text-muted-foreground">Attendance portal</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            The sidebar header everyone at this school will see.
          </p>
        </div>

        <fieldset className="flex flex-col gap-4">
          <legend className="font-heading text-sm font-semibold text-foreground">School details</legend>

          <div className="flex flex-col gap-2">
            <Label htmlFor="school-name">School name</Label>
            <Input
              id="school-name"
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? "school-name-error" : undefined}
              {...register("name")}
            />
            {errors.name && (
              <p id="school-name-error" className="text-sm text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-foreground">Logo (optional)</legend>
            <LogoUploader
              id="school-logo"
              value={logoUrl}
              onChange={(value) => setValue("logoUrl", value, { shouldDirty: true, shouldValidate: true })}
              onInvalid={(message) => setError("logoUrl", { message })}
              error={errors.logoUrl?.message}
              describedBy="school-logo-error"
            />
          </fieldset>
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="font-heading text-sm font-semibold text-foreground">Colors</legend>
          <p className="text-sm text-muted-foreground">
            Pick the preset this school starts on — its principal can change it later in Settings.
          </p>
          <PresetPicker
            value={presetId}
            onValueChange={(value) => setValue("presetId", value, { shouldDirty: true, shouldValidate: true })}
            error={errors.presetId?.message}
          />
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="font-heading text-sm font-semibold text-foreground">Principal</legend>
          <p className="text-sm text-muted-foreground">
            Their account starts as invited so this school can be opened right away. No real email is
            sent in this demo.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="school-principal-first-name">First name</Label>
              <Input
                id="school-principal-first-name"
                aria-invalid={errors.principalFirstName ? true : undefined}
                aria-describedby={errors.principalFirstName ? "school-principal-first-name-error" : undefined}
                {...register("principalFirstName")}
              />
              {errors.principalFirstName && (
                <p id="school-principal-first-name-error" className="text-sm text-destructive">
                  {errors.principalFirstName.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="school-principal-last-name">Surname</Label>
              <Input
                id="school-principal-last-name"
                aria-invalid={errors.principalLastName ? true : undefined}
                aria-describedby={errors.principalLastName ? "school-principal-last-name-error" : undefined}
                {...register("principalLastName")}
              />
              {errors.principalLastName && (
                <p id="school-principal-last-name-error" className="text-sm text-destructive">
                  {errors.principalLastName.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="school-principal-email">Email</Label>
            <Input
              id="school-principal-email"
              type="email"
              aria-invalid={errors.principalEmail ? true : undefined}
              aria-describedby={errors.principalEmail ? "school-principal-email-error" : undefined}
              {...register("principalEmail")}
            />
            {errors.principalEmail && (
              <p id="school-principal-email-error" className="text-sm text-destructive">
                {errors.principalEmail.message}
              </p>
            )}
          </div>
        </fieldset>
      </div>

      <SheetFooter className="flex-row justify-end border-t border-border">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Creating…
            </>
          ) : (
            "Create school"
          )}
        </Button>
      </SheetFooter>
    </form>
  );
}
