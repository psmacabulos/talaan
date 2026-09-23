"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Loader2, Nfc } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { linkCard, replaceCard } from "./card-actions";
import { CardStatusBadge } from "./card-status-badge";
import type { Card } from "./types";

type Mode = "idle" | "waiting" | "confirm";

/**
 * The drawer's ID card section (Step 16) — only rendered for an existing
 * student (a brand-new, not-yet-saved one has nothing to link a card to).
 * Owns a small state machine of its own, independent of the surrounding
 * React Hook Form, since linking/replacing a card saves immediately
 * through its own server actions rather than through the form's Save
 * button. Starts from the `cards` prop and updates optimistically from
 * each action's returned card — `refresh()` inside those actions keeps the
 * students table's own badge in sync for whenever the drawer is reopened.
 */
export function CardBox({ studentId, cards: initialCards }: { studentId: string; cards: Card[] }) {
  const [cards, setCards] = useState(initialCards);
  const [mode, setMode] = useState<Mode>("idle");
  const [isPending, startTransition] = useTransition();

  const activeCard = cards.find((card) => card.status === "active");
  // Oldest first, so "the current lost card" (if there's no active one) is
  // always the most recent entry, not whatever order the array happens to
  // be in.
  const history = cards
    .filter((card) => card.status !== "active")
    .sort((a, b) => a.linkedAt.localeCompare(b.linkedAt));
  const currentLost = activeCard ? undefined : history[history.length - 1];
  const olderHistory = activeCard ? history : history.slice(0, -1);

  function handleSimulateTap() {
    startTransition(async () => {
      const result = await linkCard(studentId);
      if (!result.ok) {
        toast.error(result.formError);
        return;
      }
      setCards((current) => [...current, result.card]);
      setMode("idle");
      toast(`Card ${result.card.serial} linked`);
    });
  }

  function handleConfirmReplace() {
    startTransition(async () => {
      const result = await replaceCard(studentId);
      if (!result.ok) {
        toast.error(result.formError);
        setMode("idle");
        return;
      }
      setCards((current) => current.map((card) => (card.id === result.card.id ? result.card : card)));
      setMode("waiting");
    });
  }

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-3 font-heading text-sm font-semibold text-foreground">ID card</legend>

      {mode === "waiting" ? (
        <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-4">
          <div className="flex items-center gap-3">
            <span className="relative flex size-3">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60 motion-reduce:animate-none" />
              <span className="relative inline-flex size-3 rounded-full bg-primary" />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">Hold the card against the reader</p>
              <p className="text-sm text-muted-foreground">Waiting for a tap…</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={isPending} onClick={handleSimulateTap}>
              {isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Nfc className="size-4" aria-hidden="true" />
              )}
              Simulate a card tap
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={() => setMode("idle")}>
              Cancel
            </Button>
          </div>
        </div>
      ) : mode === "confirm" ? (
        <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-foreground">Mark this card as lost?</p>
              <p className="text-sm text-muted-foreground">
                It will stop working at every tap station. You&apos;ll then tap a new card to link it.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="destructive" size="sm" disabled={isPending} onClick={handleConfirmReplace}>
              {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              Yes, replace card
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={isPending} onClick={() => setMode("idle")}>
              Keep card
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          {activeCard ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <CardStatusBadge status="active" />
                <span className="font-mono text-sm break-all text-foreground">{activeCard.serial}</span>
              </div>
              <CardHistory history={olderHistory} />
              <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setMode("confirm")}>
                Card lost? Replace it
              </Button>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <CardStatusBadge status={currentLost ? "lost" : "none"} />
                {currentLost ? <span className="font-mono text-sm break-all text-foreground">{currentLost.serial}</span> : null}
              </div>
              {currentLost ? (
                <CardHistory history={olderHistory} />
              ) : (
                <p className="text-sm text-muted-foreground">No card is linked to this student yet.</p>
              )}
              <Button type="button" size="sm" className="w-fit" onClick={() => setMode("waiting")}>
                {currentLost ? "Link a new card" : "Link card"}
              </Button>
            </>
          )}
        </div>
      )}
    </fieldset>
  );
}

function CardHistory({ history }: { history: Card[] }) {
  if (history.length === 0) return null;
  return (
    <p className="text-sm text-muted-foreground">
      Previous cards:{" "}
      {history.map((card, index) => (
        <span key={card.id}>
          <span className="font-mono break-all">{card.serial}</span> (lost)
          {index < history.length - 1 ? ", " : ""}
        </span>
      ))}
    </p>
  );
}
