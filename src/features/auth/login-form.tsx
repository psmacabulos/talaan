"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema } from "./schemas";
import type { LoginInput } from "./types";
import { signIn } from "./actions";
import { FORGOT_PASSWORD_MESSAGE } from "./messages";

/**
 * Staff sign-in (Step 50.1): validates in the browser, then `signIn`
 * checks the real password on the server and redirects to the dashboard.
 * A refusal ("isn't right", "Too many tries") shows above the button,
 * and the typed email stays. "Forgot your password?" goes to
 * /forgot-password (Step 55.5), or, while a live server can't send email
 * yet (`canResetByEmail` false), opens a note saying who to ask instead.
 */
export function LoginForm({ canResetByEmail }: { canResetByEmail: boolean }) {
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showForgotHelp, setShowForgotHelp] = useState(false);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(values: LoginInput) {
    setFormError(null);
    startTransition(async () => {
      const result = await signIn(values);
      if (result && !result.ok) setFormError(result.formError);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          type="email"
          size="lg"
          autoComplete="username"
          placeholder="you@yourschool.example"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "login-email-error" : undefined}
          {...register("email")}
        />
        {errors.email && (
          <p id="login-email-error" className="text-sm text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="login-password">Password</Label>
        <div className="relative">
          <Input
            id="login-password"
            type={showPassword ? "text" : "password"}
            size="lg"
            autoComplete="current-password"
            className="pr-11"
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? "login-password-error" : undefined}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((shown) => !shown)}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
        {errors.password && (
          <p id="login-password-error" className="text-sm text-destructive">
            {errors.password.message}
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
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </Button>

      {canResetByEmail ? (
        <Link
          href="/forgot-password"
          className="w-fit rounded-sm text-sm text-link underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Forgot your password?
        </Link>
      ) : (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowForgotHelp((shown) => !shown)}
            aria-expanded={showForgotHelp}
            aria-controls="login-forgot-help"
            className="text-sm text-link underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm w-fit"
          >
            Forgot your password?
          </button>
          <p id="login-forgot-help" hidden={!showForgotHelp} className="text-sm text-muted-foreground">
            {FORGOT_PASSWORD_MESSAGE}
          </p>
        </div>
      )}
    </form>
  );
}
