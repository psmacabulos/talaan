"use client";

import { Check, Copy } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
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
import { SET_PASSWORD_LINK_DAYS } from "@/features/auth/set-password-rules";
import type { SignInLink } from "./sign-in-link";

/**
 * Shows a set-password link to copy and send (Step 50.5): after Add staff,
 * after Add school (for its principal), and from the staff ⋮ menu. No
 * email goes out; the principal sends it however they already reach the
 * person. Closed when `link` is null.
 */
export function SignInLinkDialog({ link, onClose }: { link: SignInLink | null; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);
  // Keeps the last link on screen while the dialog fades out after `link`
  // turns null, instead of the text going blank mid-animation.
  const [shown, setShown] = useState<SignInLink | null>(link);
  if (link && link !== shown) {
    setShown(link);
    setCopied(false);
  }
  const firstName = shown?.name.split(" ")[0] ?? "";

  function close() {
    setCopied(false);
    onClose();
  }

  async function copy() {
    if (!shown) return;
    try {
      await navigator.clipboard.writeText(shown.url);
      setCopied(true);
      toast("Link copied");
    } catch {
      // Some browsers refuse the clipboard; select the text so Ctrl+C or a long press still works.
      inputRef.current?.select();
      toast("Select the link and copy it");
    }
  }

  return (
    <Dialog
      open={link !== null}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent>
        <DialogHeader>
          {/* pr-8 keeps a long name clear of the dialog's close button. */}
          <DialogTitle className="pr-8">
            {shown?.kind === "reset" ? `Password reset link for ${shown.name}` : `Send this link to ${shown?.name}`}
          </DialogTitle>
          <DialogDescription>
            {shown?.kind === "reset"
              ? `${firstName} opens it to choose a new password. Their other devices are signed out once they do.`
              : `${firstName} opens it to set a password and sign in.`}{" "}
            It works once, for {SET_PASSWORD_LINK_DAYS} days. Send it any way you like, such as Messenger, Viber or SMS.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="sign-in-link">Link</Label>
          <div className="flex gap-2">
            <Input
              id="sign-in-link"
              ref={inputRef}
              readOnly
              value={shown?.url ?? ""}
              onFocus={(event) => event.currentTarget.select()}
              className="min-w-0 flex-1 font-mono text-xs"
            />
            <Button type="button" onClick={copy} className="shrink-0">
              {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={close}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
