"use client";

import { type FormEvent, useId, useRef, useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PRODUCT_NAME } from "@/lib/product";
import { formatSchoolDate } from "@/lib/school-time";
import { NOTICE_MAX_LENGTH, noticeBodySchema, normalizeNotice } from "./notice-schema";
import { publishPrivacyNotice } from "./privacy-actions";
import { sameTextMessage } from "./privacy-messages";
import type { NoticeVersion, PrivacyNotice } from "./types";

/**
 * Settings > Privacy notice (Step 60.4). The school's own wording, as plain
 * text, starting from the current version. "Publish" checks it here first,
 * then asks for a confirmation, since every parent will be asked to accept
 * the new version (Step 60.5). The text stays in the box whatever the
 * server answers, so nothing typed is lost.
 */
export function PrivacyNoticeForm({ current, earlier }: { current: PrivacyNotice | null; earlier: NoticeVersion[] }) {
  const [text, setText] = useState(current?.body ?? "");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const publishRef = useRef<HTMLButtonElement>(null);
  const fieldId = useId();
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  const basedOnVersion = current?.version ?? 0;
  const nextVersion = basedOnVersion + 1;
  const length = normalizeNotice(text).length;

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const parsed = noticeBodySchema.safeParse(text);
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Check the notice's wording.");
      return;
    }
    if (current && parsed.data === current.body) {
      setFieldError(sameTextMessage(current.version));
      return;
    }
    setFieldError(null);
    setConfirming(true);
  }

  function publish() {
    startTransition(async () => {
      const result = await publishPrivacyNotice({ body: text, basedOnVersion });
      setConfirming(false);
      if (result.ok) {
        toast(`Published version ${result.version} of the privacy notice.`);
        return;
      }
      if ("fieldError" in result) setFieldError(result.fieldError);
      else setFormError(result.formError);
    });
  }

  return (
    <form onSubmit={review} noValidate className="flex flex-col gap-4">
      <p className="text-sm text-foreground">
        {current ? (
          <>
            <span className="font-semibold">Version {current.version}</span>, published{" "}
            {formatSchoolDate(current.publishedAt)}.
          </>
        ) : (
          <>
            <span className="font-semibold">Not published yet.</span> Parents can&apos;t link a child at this school
            until you publish one.
          </>
        )}
      </p>

      <div className="flex flex-col gap-2">
        <Label htmlFor={fieldId}>Notice wording</Label>
        <Textarea
          id={fieldId}
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="max-h-96 min-h-64 overflow-y-auto"
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={fieldError ? `${hintId} ${errorId}` : hintId}
          disabled={isPending}
        />
        <p id={hintId} className="text-sm text-muted-foreground">
          Plain text. Leave a blank line between paragraphs. {length.toLocaleString("en-US")} of{" "}
          {NOTICE_MAX_LENGTH.toLocaleString("en-US")} characters.
        </p>
        {fieldError ? (
          <p id={errorId} className="text-sm text-destructive">
            {fieldError}
          </p>
        ) : null}
      </div>

      {formError ? (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      ) : null}

      <div>
        <Button ref={publishRef} type="submit" disabled={isPending}>
          Publish as version {nextVersion}…
        </Button>
      </div>

      {earlier.length > 0 ? (
        <p className="text-sm text-muted-foreground">
          Earlier versions, kept as published:{" "}
          {earlier.map((notice) => `version ${notice.version} (${formatSchoolDate(notice.publishedAt)})`).join(", ")}.
        </p>
      ) : null}

      <Dialog open={confirming} onOpenChange={(open) => !isPending && setConfirming(open)}>
        <DialogContent
          showCloseButton={false}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            publishRef.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>Publish version {nextVersion}?</DialogTitle>
            <DialogDescription>
              Every parent with a child at this school will be asked to read and accept version {nextVersion} before
              they can use {PRODUCT_NAME} again. A published version can&apos;t be changed or removed; a correction is a
              new version.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirming(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="button" onClick={publish} disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              {isPending ? "Publishing…" : `Publish version ${nextVersion}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
