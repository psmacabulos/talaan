"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setPasswordWithLink } from "./actions";
import { setPasswordSchema } from "./schemas";
import type { SetPasswordInput } from "./types";

/**
 * The form on /set-password (Step 50.5): a new password, typed twice,
 * checked here and again on the server. On success the server signs the
 * person in and goes to the dashboard.
 */
export function SetPasswordForm({ token }: { token: string }) {
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SetPasswordInput>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  function onSubmit(values: SetPasswordInput) {
    setFormError(null);
    startTransition(async () => {
      const result = await setPasswordWithLink(token, values);
      if (!result || result.ok) return;
      if (result.fieldErrors) {
        for (const [field, message] of Object.entries(result.fieldErrors) as [keyof SetPasswordInput, string][]) {
          setError(field, { message });
        }
      }
      if (result.formError) setFormError(result.formError);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="new-password">New password</Label>
        <Input
          id="new-password"
          type="password"
          size="lg"
          autoComplete="new-password"
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? "new-password-error" : "new-password-hint"}
          {...register("password")}
        />
        {errors.password ? (
          <p id="new-password-error" className="text-sm text-destructive">
            {errors.password.message}
          </p>
        ) : (
          <p id="new-password-hint" className="text-sm text-muted-foreground">
            At least 8 characters.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirm-password">Confirm password</Label>
        <Input
          id="confirm-password"
          type="password"
          size="lg"
          autoComplete="new-password"
          aria-invalid={errors.confirmPassword ? true : undefined}
          aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <p id="confirm-password-error" className="text-sm text-destructive">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}

      <Button type="submit" size="lg" disabled={isPending} className="mt-2 w-full">
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Saving…
          </>
        ) : (
          "Set password and sign in"
        )}
      </Button>
    </form>
  );
}
