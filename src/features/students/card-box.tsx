"use client";

import { useEffect, useId, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { AlertTriangle, Loader2, Nfc } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkCardSerial } from "./card-actions";
import { CardStatusBadge } from "./card-status-badge";
import { hasCardChange, NO_CARD_CHANGE, type PendingCard } from "./student-changes";
import type { Card } from "./types";

type Mode = "idle" | "waiting" | "confirm";

/**
 * The drawer's ID card section (Step 16). In "waiting", a Card serial field
 * takes a real card (Step 44.7): the USB reader types into it and presses
 * Enter. "Simulate a card tap" stays for demos without a reader.
 *
 * Saves nothing itself (2026-10-12): a tapped card is only checked, then
 * held in `pending` until the student form's Save button, which links it
 * (and marks the old card lost, when replacing) in the same save. Undo, or
 * the form's Cancel, throws it away, so a sticker tapped by mistake is
 * never linked or marked lost.
 */
export function CardBox({
  cards,
  pending,
  onPendingChange,
  error,
}: {
  /** The saved cards. */
  cards: Card[];
  pending: PendingCard;
  onPendingChange: (pending: PendingCard) => void;
  /** Why the last Save refused the card, if it did. */
  error: string | null;
}) {
  const [mode, setMode] = useState<Mode>("idle");
  const [serialInput, setSerialInput] = useState("");
  const [serialError, setSerialError] = useState<string | null>(null);
  const [isChecking, startChecking] = useTransition();
  const serialId = useId();
  const errorId = useId();
  const serialRef = useRef<HTMLInputElement>(null);

  // The USB reader types into whatever has focus, so the field must have it
  // whenever the box is waiting for a card: when the panel opens, and again
  // after a refused card. It waits until the check is done, because the
  // field is disabled meanwhile and a disabled input can't take focus.
  useEffect(() => {
    if (mode === "waiting" && !isChecking) serialRef.current?.focus();
  }, [mode, isChecking]);

  const activeCard = cards.find((card) => card.status === "active");
  // Oldest first, so "the current lost card" (if there's no active one) is
  // always the most recent entry, not whatever order the array happens to
  // be in.
  const history = cards.filter((card) => card.status !== "active").sort((a, b) => a.linkedAt.localeCompare(b.linkedAt));
  const currentLost = activeCard ? undefined : history[history.length - 1];
  const olderHistory = activeCard ? history : history.slice(0, -1);

  function startWaiting() {
    setSerialInput("");
    setSerialError(null);
    setMode("waiting");
  }

  function handleUseCard() {
    if (!serialInput.trim()) return;
    startChecking(async () => {
      const result = await checkCardSerial(serialInput);
      if (!result.ok) {
        if (result.fieldError) setSerialError(result.fieldError);
        if (result.formError) toast.error(result.formError);
        return;
      }
      onPendingChange({ ...pending, link: { kind: "reader", serial: result.serial } });
      setMode("idle");
    });
  }

  // The card box sits inside the student form, so a plain Enter here would
  // submit the whole student. The USB reader presses Enter after every
  // card, so Enter only checks the card; saving stays the Save button's job.
  function handleSerialKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    handleUseCard();
  }

  function handleSimulateTap() {
    onPendingChange({ ...pending, link: { kind: "simulated" } });
    setMode("idle");
  }

  function handleUndo() {
    onPendingChange(NO_CARD_CHANGE);
    setMode("idle");
  }

  return (
    <fieldset className="flex flex-col gap-4" aria-describedby={error ? errorId : undefined}>
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
              <p className="text-sm text-muted-foreground">Or type the serial from an NFC app, then press Enter.</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={serialId}>Card serial</Label>
            <Input
              id={serialId}
              ref={serialRef}
              autoComplete="off"
              spellCheck={false}
              className="font-mono"
              value={serialInput}
              disabled={isChecking}
              aria-invalid={serialError ? true : undefined}
              aria-describedby={serialError ? `${serialId}-error` : undefined}
              onChange={(event) => {
                setSerialInput(event.target.value);
                setSerialError(null);
              }}
              onKeyDown={handleSerialKeyDown}
            />
            {serialError ? (
              <p id={`${serialId}-error`} className="text-sm text-destructive">
                {serialError}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={isChecking || !serialInput.trim()} onClick={handleUseCard}>
              {isChecking ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              Use this card
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={isChecking} onClick={handleSimulateTap}>
              <Nfc className="size-4" aria-hidden="true" />
              Simulate a card tap
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={isChecking} onClick={handleUndo}>
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
                Once you save, it stops working at every gate. You&apos;ll tap the new card next.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                onPendingChange({ replaceLost: true, link: null });
                startWaiting();
              }}
            >
              Yes, replace card
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setMode("idle")}>
              Keep card
            </Button>
          </div>
        </div>
      ) : hasCardChange(pending) ? (
        <div className="flex flex-col gap-3 rounded-lg border border-dashed border-primary p-4">
          {pending.link ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-foreground">New card</span>
              <span className="font-mono text-sm break-all text-foreground">
                {pending.link.kind === "reader" ? pending.link.serial : "(a simulated card)"}
              </span>
            </div>
          ) : null}
          {pending.replaceLost && activeCard ? (
            <p className="text-sm text-muted-foreground">
              The current card, <span className="font-mono break-all">{activeCard.serial}</span>, will be marked lost.
            </p>
          ) : null}
          <p className="text-sm text-muted-foreground">Not saved yet. It&apos;s saved when you save the student.</p>
          <div className="flex flex-wrap gap-2">
            {pending.link ? null : (
              <Button type="button" size="sm" onClick={startWaiting}>
                Link the new card
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" className="w-fit" onClick={handleUndo}>
              Undo
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
                {currentLost ? (
                  <span className="font-mono text-sm break-all text-foreground">{currentLost.serial}</span>
                ) : null}
              </div>
              {currentLost ? (
                <CardHistory history={olderHistory} />
              ) : (
                <p className="text-sm text-muted-foreground">No card is linked to this student yet.</p>
              )}
              <Button type="button" size="sm" className="w-fit" onClick={startWaiting}>
                {currentLost ? "Link a new card" : "Link card"}
              </Button>
            </>
          )}
        </div>
      )}

      {error ? (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
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
