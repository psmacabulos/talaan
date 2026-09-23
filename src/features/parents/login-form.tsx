"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInParent } from "./auth-actions";
import { parentLoginSchema } from "./auth-schemas";
import type { ParentLoginInput } from "./types";

/**
 * Step 22's parent sign-in — a real credential check against the mock
 * `ParentRepository` (unlike the staff login form, which always signs in as
 * a fixed demo persona). A successful submission redirects server-side.
 */
export function ParentLoginForm() {
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ParentLoginInput>({
    resolver: zodResolver(parentLoginSchema),
    defaultValues: { email: "", password: "" },
  });

  const busy = isPending || isSubmitting;

  function onSubmit(data: ParentLoginInput) {
    startTransition(async () => {
      const result = await signInParent(data);
      if (!result.ok) {
        toast.error(result.formError);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="parent-login-email">Email</Label>
        <Input
          id="parent-login-email"
          type="email"
          size="lg"
          autoComplete="username"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "parent-login-email-error" : undefined}
          {...register("email")}
        />
        {errors.email && (
          <p id="parent-login-email-error" className="text-sm text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="parent-login-password">Password</Label>
        <Input
          id="parent-login-password"
          type="password"
          size="lg"
          autoComplete="current-password"
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? "parent-login-password-error" : undefined}
          {...register("password")}
        />
        {errors.password && (
          <p id="parent-login-password-error" className="text-sm text-destructive">
            {errors.password.message}
          </p>
        )}
      </div>

      <Button type="submit" size="lg" disabled={busy} className="mt-2 w-full">
        {busy ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link href="/parent/signup" className="text-link underline underline-offset-2">
          Create an account
        </Link>
      </p>
    </form>
  );
}
