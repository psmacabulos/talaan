"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PARENT_RESET_SENT_MESSAGE } from "@/features/auth/messages";
import { forgotPasswordSchema } from "@/features/auth/schemas";
import type { ForgotPasswordInput } from "@/features/auth/types";
import { requestParentPasswordReset, resetParentPassword } from "./auth-actions";
import { parentResetPasswordSchema } from "./auth-schemas";
import type { ParentResetPasswordInput } from "./types";

/** How long "Send a new code" waits after each send, so a double tap doesn't use up the hour's 3. */
const RESEND_WAIT_MS = 30_000;

/**
 * The web portal's "Forgot your password?" (Step 55.6), in two stages: the
 * email, then the emailed code with a new password. The email stays in
 * this component, never in the address bar (the address bar reaches the
 * server's logs). On success the action signs this browser in and goes to
 * /parent; a refusal keeps everything typed.
 */
export function ParentForgotPasswordForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);

  return sentTo ? (
    <ResetStage email={sentTo} onUseAnotherEmail={() => setSentTo(null)} />
  ) : (
    <EmailStage onSent={setSentTo} />
  );
}

function EmailStage({ onSent }: { onSent: (email: string) => void }) {
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    getValues,
    setFocus,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  useEffect(() => setFocus("email"), [setFocus]);

  function onSubmit() {
    setFormError(null);
    const email = getValues("email").trim();
    startTransition(async () => {
      const result = await requestParentPasswordReset({ email });
      if (result.ok) onSent(email);
      else setFormError(result.formError);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="parent-forgot-email">Email</Label>
        <Input
          id="parent-forgot-email"
          type="email"
          size="lg"
          autoComplete="username"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "parent-forgot-email-error" : undefined}
          {...register("email")}
        />
        {errors.email && (
          <p id="parent-forgot-email-error" className="text-sm text-destructive">
            {errors.email.message}
          </p>
        )}
      </div>

      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}

      <Button type="submit" size="lg" disabled={isPending} className="w-full">
        {isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Sending…
          </>
        ) : (
          "Send code"
        )}
      </Button>
    </form>
  );
}

function ResetStage({ email, onUseAnotherEmail }: { email: string; onUseAnotherEmail: () => void }) {
  const [formError, setFormError] = useState<string | null>(null);
  const [resendNote, setResendNote] = useState<string | null>(null);
  const [resendWaiting, setResendWaiting] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [isResending, startResend] = useTransition();
  const resendTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<ParentResetPasswordInput>({
    resolver: zodResolver(parentResetPasswordSchema),
    defaultValues: { code: "", password: "", confirmPassword: "" },
  });

  function waitBeforeResend() {
    setResendWaiting(true);
    if (resendTimer.current) clearTimeout(resendTimer.current);
    resendTimer.current = setTimeout(() => setResendWaiting(false), RESEND_WAIT_MS);
  }

  useEffect(() => {
    setFocus("code");
    // A code was just sent: "Send a new code" starts waiting.
    resendTimer.current = setTimeout(() => setResendWaiting(false), RESEND_WAIT_MS);
    return () => {
      if (resendTimer.current) clearTimeout(resendTimer.current);
    };
  }, [setFocus]);

  function onSubmit(data: ParentResetPasswordInput) {
    setFormError(null);
    startTransition(async () => {
      const result = await resetParentPassword(email, data);
      // Success redirects, so only a refusal comes back.
      if (result.fieldErrors) {
        for (const [field, message] of Object.entries(result.fieldErrors) as [
          keyof ParentResetPasswordInput,
          string,
        ][]) {
          setError(field, { message });
        }
      }
      if (result.formError) setFormError(result.formError);
    });
  }

  function sendNewCode() {
    setResendNote(null);
    startResend(async () => {
      const result = await requestParentPasswordReset({ email });
      setResendNote(result.ok ? "We've sent a new code. Only the newest one works." : result.formError);
      waitBeforeResend();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <p id="parent-reset-sent" role="status" className="text-sm text-foreground">
          {PARENT_RESET_SENT_MESSAGE}
        </p>
        <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium break-all text-foreground">
          {email}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="parent-reset-code">6-digit code</Label>
          <Input
            id="parent-reset-code"
            size="lg"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            aria-invalid={errors.code ? true : undefined}
            aria-describedby={errors.code ? "parent-reset-sent parent-reset-code-error" : "parent-reset-sent"}
            {...register("code")}
          />
          {errors.code && (
            <p id="parent-reset-code-error" className="text-sm text-destructive">
              {errors.code.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="parent-reset-password">New password</Label>
          <Input
            id="parent-reset-password"
            type="password"
            size="lg"
            autoComplete="new-password"
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? "parent-reset-password-error" : undefined}
            {...register("password")}
          />
          {errors.password && (
            <p id="parent-reset-password-error" className="text-sm text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="parent-reset-confirm-password">Confirm new password</Label>
          <Input
            id="parent-reset-confirm-password"
            type="password"
            size="lg"
            autoComplete="new-password"
            aria-invalid={errors.confirmPassword ? true : undefined}
            aria-describedby={errors.confirmPassword ? "parent-reset-confirm-password-error" : undefined}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p id="parent-reset-confirm-password-error" className="text-sm text-destructive">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {formError && (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        )}

        <Button type="submit" size="lg" disabled={isPending} className="mt-1 w-full">
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Setting password…
            </>
          ) : (
            "Set new password"
          )}
        </Button>
      </form>

      <div className="flex flex-col gap-3 border-t border-border pt-5">
        <p className="text-sm text-muted-foreground">Didn&apos;t get it? Check your spam folder, or send a new code.</p>
        <p role="status" className="text-sm text-foreground empty:hidden">
          {resendNote}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="flex-1"
            disabled={resendWaiting || isResending}
            onClick={sendNewCode}
          >
            {isResending ? "Sending…" : "Send a new code"}
          </Button>
          <Button type="button" variant="ghost" size="lg" className="flex-1" onClick={onUseAnotherEmail}>
            Use a different email
          </Button>
        </div>
      </div>
    </div>
  );
}
