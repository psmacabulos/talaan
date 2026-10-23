"use client";

import { useRef, useState, useTransition, type RefObject } from "react";
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
import type { LinkedGuardian, RemovedGuardian } from "@/features/parents/types";
import { PRODUCT_NAME } from "@/lib/product";
import { formatSchoolDate } from "@/lib/school-time";
import { allowParentLinkAgain, removeParentLink } from "./parent-link-actions";

/**
 * The drawer's "Parent accounts" (Step 55.3): who has linked this child in
 * the parent app, so a principal can spot someone who shouldn't have, and
 * since Step 55.4 remove them, or allow a removed parent again. Name, mobile
 * and the day they linked; never the parent's email. It sits inside the
 * student form, but nothing here is part of its Save: every button is
 * `type="button"`, and Remove and Allow again take effect at once.
 */
export function LinkedParents({
  childFirstName,
  guardians,
  removed,
}: {
  childFirstName: string;
  guardians: LinkedGuardian[];
  removed: RemovedGuardian[];
}) {
  // Where focus goes after a removal: the Remove button that opened the
  // dialog leaves with its row, so focus would otherwise drop to the page.
  const headingRef = useRef<HTMLHeadingElement>(null);

  return (
    <section aria-labelledby="linked-parents-heading" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3
          id="linked-parents-heading"
          ref={headingRef}
          tabIndex={-1}
          className="font-heading text-sm font-semibold text-foreground focus-visible:outline-none"
        >
          Parent accounts
        </h3>
        <p className="text-sm text-muted-foreground">
          Parents who linked {childFirstName} in the {PRODUCT_NAME} app. They see {childFirstName}&apos;s arrivals and
          get notifications about {childFirstName}.
        </p>
      </div>
      {guardians.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
          No parent has linked {childFirstName} in the app yet.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {guardians.map((guardian) => (
            <li key={guardian.linkId} className="flex items-center gap-3 px-3 py-2.5">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-medium text-foreground">
                  {guardian.parent.firstName} {guardian.parent.lastName}
                </span>
                <span className="text-sm text-muted-foreground">
                  {guardian.parent.mobile} · Linked {formatSchoolDate(guardian.linkedAt)}
                </span>
              </div>
              <RemoveButton childFirstName={childFirstName} guardian={guardian} focusAfter={headingRef} />
            </li>
          ))}
        </ul>
      )}
      {removed.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h4 className="text-sm font-medium text-foreground">Removed</h4>
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {removed.map((block) => (
              <li key={block.blockId} className="flex items-center gap-3 px-3 py-2.5">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-medium text-foreground">
                    {block.parent.firstName} {block.parent.lastName}
                  </span>
                  <span className="text-sm text-muted-foreground">{removedLine(block)}</span>
                </div>
                <AllowAgainButton childFirstName={childFirstName} block={block} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

/** "Removed October 22, 2026 by Catherine Jongco", or "by a former staff member" once they're gone. */
export function removedLine({ removedAt, removedBy }: Pick<RemovedGuardian, "removedAt" | "removedBy">): string {
  const by = removedBy ? `${removedBy.firstName} ${removedBy.lastName}` : "a former staff member";
  return `Removed ${formatSchoolDate(removedAt)} by ${by}`;
}

function RemoveButton({
  childFirstName,
  guardian,
  focusAfter,
}: {
  childFirstName: string;
  guardian: LinkedGuardian;
  /** Focused when the dialog closes after a removal, since this button is about to go. */
  focusAfter: RefObject<HTMLHeadingElement | null>;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const removed = useRef(false);
  const name = `${guardian.parent.firstName} ${guardian.parent.lastName}`;

  function handleRemove() {
    startTransition(async () => {
      const result = await removeParentLink(guardian.linkId);
      removed.current = result.ok;
      setOpen(false);
      if (result.ok) toast(`${name} was removed from ${childFirstName}'s parent accounts.`);
      else toast.error(result.error);
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => setOpen(true)}
        aria-label={`Remove ${name}`}
        className="min-h-11 shrink-0 sm:min-h-8"
      >
        Remove
      </Button>
      <Dialog open={open} onOpenChange={(next) => !isPending && setOpen(next)}>
        <DialogContent
          showCloseButton={false}
          onCloseAutoFocus={(event) => {
            if (!removed.current) return;
            event.preventDefault();
            focusAfter.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              Remove {name} from {childFirstName}&apos;s parent accounts?
            </DialogTitle>
            <DialogDescription>
              {name} will stop seeing {childFirstName}&apos;s arrivals and getting notifications about {childFirstName}.
              They can&apos;t link {childFirstName} again unless you allow it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleRemove} disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              {isPending ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** No confirmation: it undoes a removal, and nothing changes until that parent links again. */
function AllowAgainButton({ childFirstName, block }: { childFirstName: string; block: RemovedGuardian }) {
  const [isPending, startTransition] = useTransition();
  const name = `${block.parent.firstName} ${block.parent.lastName}`;

  function handleAllow() {
    startTransition(async () => {
      const result = await allowParentLinkAgain(block.blockId);
      if (result.ok) toast(`${name} can link ${childFirstName} again.`);
      else toast.error(result.error);
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={handleAllow}
      aria-label={`Allow ${name} again`}
      className="min-h-11 shrink-0 sm:min-h-8"
    >
      {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
      Allow again
    </Button>
  );
}
