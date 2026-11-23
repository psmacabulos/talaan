"use client";

import { useId, useRef, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteMyAccount } from "./auth-actions";

/**
 * "Delete my account" (Step 60.2): a button, and a confirmation that says
 * plainly what goes and asks for the password. A wrong password or a lock
 * shows under the field and keeps the dialog open; success redirects to the
 * sign-in page from the server, so nothing here handles it.
 */
export function DeleteAccountDialog() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const fieldId = useId();
  const errorId = `${fieldId}-error`;

  function reset(next: boolean) {
    if (isPending) return;
    setOpen(next);
    if (!next) {
      setPassword("");
      setError(null);
    }
  }

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await deleteMyAccount(password);
      // Only a failure comes back: success redirects.
      if (!result.ok) setError(result.formError);
    });
  }

  return (
    <>
      <Button ref={triggerRef} type="button" variant="destructive" onClick={() => reset(true)}>
        Delete my account
      </Button>

      <Dialog open={open} onOpenChange={reset}>
        <DialogContent
          showCloseButton={false}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            triggerRef.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This can&apos;t be undone. Your sign-ins, your phones&apos; notifications and your links to your children
              are deleted, and you will stop getting notifications. Your children&apos;s school records stay with the
              school, and other guardians keep their access.
            </DialogDescription>
          </DialogHeader>

          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              confirm();
            }}
            className="flex flex-col gap-2"
          >
            <Label htmlFor={fieldId}>Enter your password to confirm</Label>
            <Input
              id={fieldId}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              disabled={isPending}
            />
            {error ? (
              <p id={errorId} role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </form>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => reset(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={confirm} disabled={isPending || password === ""}>
              {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              {isPending ? "Deleting…" : "Delete my account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
