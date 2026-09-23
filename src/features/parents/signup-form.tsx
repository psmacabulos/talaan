"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { signUpParent } from "./auth-actions";
import { parentSignupSchema } from "./auth-schemas";
import type { ParentSignupInput } from "./types";

function emptyValues(): ParentSignupInput {
  return {
    firstName: "",
    lastName: "",
    mobile: "",
    email: "",
    schoolId: "",
    password: "",
    confirmPassword: "",
  };
}

/**
 * Step 22's parent signup. A successful submission redirects server-side
 * (`signUpParent` calls `redirect`), so `onSubmit` has nothing to do on
 * `result.ok` — only the error paths need handling here.
 */
export function ParentSignupForm({ schools }: { schools: { id: string; name: string }[] }) {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ParentSignupInput>({
    resolver: zodResolver(parentSignupSchema),
    defaultValues: emptyValues(),
  });

  const busy = isPending || isSubmitting;

  function onSubmit(data: ParentSignupInput) {
    startTransition(async () => {
      const result = await signUpParent(data);
      if (result.ok) return;

      if (result.fieldErrors) {
        for (const [field, message] of Object.entries(result.fieldErrors) as [keyof ParentSignupInput, string][]) {
          setError(field, { message });
        }
      }
      if (result.formError) {
        toast.error(result.formError);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="signup-first-name">First name</Label>
          <Input
            id="signup-first-name"
            aria-invalid={errors.firstName ? true : undefined}
            aria-describedby={errors.firstName ? "signup-first-name-error" : undefined}
            {...register("firstName")}
          />
          {errors.firstName && (
            <p id="signup-first-name-error" className="text-sm text-destructive">
              {errors.firstName.message}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="signup-last-name">Last name</Label>
          <Input
            id="signup-last-name"
            aria-invalid={errors.lastName ? true : undefined}
            aria-describedby={errors.lastName ? "signup-last-name-error" : undefined}
            {...register("lastName")}
          />
          {errors.lastName && (
            <p id="signup-last-name-error" className="text-sm text-destructive">
              {errors.lastName.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          type="email"
          autoComplete="email"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "signup-email-error" : undefined}
          {...register("email")}
        />
        {errors.email && (
          <p id="signup-email-error" className="text-sm text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-mobile">Mobile number</Label>
        <Input
          id="signup-mobile"
          type="tel"
          placeholder="09171234567"
          aria-invalid={errors.mobile ? true : undefined}
          aria-describedby={errors.mobile ? "signup-mobile-error" : undefined}
          {...register("mobile")}
        />
        {errors.mobile && (
          <p id="signup-mobile-error" className="text-sm text-destructive">
            {errors.mobile.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-school">Your child&apos;s school</Label>
        <Controller
          control={control}
          name="schoolId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger
                id="signup-school"
                className="w-full"
                aria-invalid={errors.schoolId ? true : undefined}
                aria-describedby={errors.schoolId ? "signup-school-error" : undefined}
              >
                <SelectValue placeholder="Select a school" />
              </SelectTrigger>
              <SelectContent>
                {schools.map((school) => (
                  <SelectItem key={school.id} value={school.id}>
                    {school.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.schoolId && (
          <p id="signup-school-error" className="text-sm text-destructive">
            {errors.schoolId.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-password">Password</Label>
        <Input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? "signup-password-error" : undefined}
          {...register("password")}
        />
        {errors.password && (
          <p id="signup-password-error" className="text-sm text-destructive">
            {errors.password.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="signup-confirm-password">Confirm password</Label>
        <Input
          id="signup-confirm-password"
          type="password"
          autoComplete="new-password"
          aria-invalid={errors.confirmPassword ? true : undefined}
          aria-describedby={errors.confirmPassword ? "signup-confirm-password-error" : undefined}
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <p id="signup-confirm-password-error" className="text-sm text-destructive">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      <Button type="submit" size="lg" disabled={busy} className="mt-2 w-full">
        {busy ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Creating account…
          </>
        ) : (
          "Create account"
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/parent/login" className="text-link underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </form>
  );
}
