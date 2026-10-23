"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "./actions";
import { RESET_SENT_MESSAGE } from "./messages";
import { forgotPasswordSchema } from "./schemas";
import type { ForgotPasswordInput } from "./types";

/**
 * "Forgot your password?" (Step 55.5): one email field. Once sent, the
 * form makes way for the same answer whatever the email, with the email
 * typed, so a typo is easy to spot. Focus moves to that answer, since the
 * button that had it is gone. "Send again" brings the form back with the
 * email still in it, and focus in it. A refusal (too many requests, the
 * day's emails used up) shows above the button.
 */
export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const answerRef = useRef<HTMLDivElement>(null);
  const sendingAgain = useRef(false);
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

  useEffect(() => {
    if (sentTo) answerRef.current?.focus();
    else if (sendingAgain.current) {
      sendingAgain.current = false;
      setFocus("email");
    }
  }, [sentTo, setFocus]);

  function onSubmit() {
    setFormError(null);
    // The typed value, not the schema's output: react-hook-form hands back the trimmed, lower-case one.
    const email = getValues("email");
    startTransition(async () => {
      const result = await requestPasswordReset({ email });
      if (result.ok) setSentTo(email.trim());
      else setFormError(result.formError);
    });
  }

  function sendAgain() {
    sendingAgain.current = true;
    setSentTo(null);
  }

  if (sentTo) {
    return (
      <div ref={answerRef} tabIndex={-1} role="status" className="flex flex-col gap-4 focus-visible:outline-none">
        <p className="text-sm text-foreground">{RESET_SENT_MESSAGE}</p>
        <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm font-medium break-all text-foreground">
          {sentTo}
        </p>
        <p className="text-sm text-muted-foreground">
          Didn&apos;t get it? Check your spam folder, or send it again in a few minutes.
        </p>
        <Button type="button" variant="outline" size="lg" className="w-full" onClick={sendAgain}>
          Send again
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="forgot-email">Email</Label>
        <Input
          id="forgot-email"
          type="email"
          size="lg"
          autoComplete="username"
          placeholder="you@yourschool.example"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "forgot-email-error" : undefined}
          {...register("email")}
        />
        {errors.email && (
          <p id="forgot-email-error" className="text-sm text-destructive">
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
          "Send reset link"
        )}
      </Button>
    </form>
  );
}
