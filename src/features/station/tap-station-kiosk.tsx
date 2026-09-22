"use client";

import { Ban, CheckCircle2, HelpCircle, Nfc, RotateCcw, Wifi, WifiOff } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DASHBOARD_NOW, formatTapTime } from "@/features/attendance/status";
import type { Tap } from "@/features/attendance/types";
import type { Card, Student } from "@/features/students/types";
import { resolveStationTap, type StationTapKind, type StationTapOutcome } from "./resolve-station-tap";
import { syncStationTaps } from "./station-actions";

const STATION_LABEL = "Main gate";
const RESET_AFTER_MS = 5000;

const SIMULATE_BUTTONS: { kind: StationTapKind; label: string }[] = [
  { kind: "valid", label: "Valid card" },
  { kind: "duplicate", label: "Already tapped" },
  { kind: "lost", label: "Lost card" },
  { kind: "unknown", label: "Unknown card" },
];

/** Only outcomes that actually wrote a `Tap` feed the *next* resolution — "duplicate"/"empty" never happened, so they can't affect who gets picked next. */
function recordedTapsFrom(outcomes: StationTapOutcome[]): Tap[] {
  return outcomes.filter((outcome) => outcome.status === "recorded").map((outcome) => outcome.tap);
}

export function TapStationKiosk({
  schoolId,
  students,
  taps,
  cards,
}: {
  schoolId: string;
  students: Student[];
  taps: Tap[];
  cards: Card[];
}) {
  const [isOffline, setIsOffline] = useState(false);
  const [result, setResult] = useState<{ outcome: StationTapOutcome; queued: boolean } | null>(null);
  const [recorded, setRecorded] = useState<StationTapOutcome[]>([]);
  const [pendingSync, setPendingSync] = useState<StationTapOutcome[]>([]);
  const [isSyncing, startTransition] = useTransition();
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showResultThenReset(outcome: StationTapOutcome, queued: boolean) {
    if (resetTimer.current) clearTimeout(resetTimer.current);
    setResult({ outcome, queued });
    resetTimer.current = setTimeout(() => setResult(null), RESET_AFTER_MS);
  }

  function handleSimulate(kind: StationTapKind) {
    const effectiveTaps = [...taps, ...recordedTapsFrom(recorded)];
    const outcome = resolveStationTap(
      kind,
      { schoolId, students, taps: effectiveTaps, cards, now: DASHBOARD_NOW },
      { tapId: crypto.randomUUID(), alertId: crypto.randomUUID() },
    );

    showResultThenReset(outcome, isOffline && outcome.status === "recorded");
    if (outcome.status !== "recorded") return;

    setRecorded((current) => [...current, outcome]);

    if (isOffline) {
      setPendingSync((current) => [...current, outcome]);
      return;
    }

    startTransition(async () => {
      await syncStationTaps([outcome]);
    });
  }

  function handleToggleOffline() {
    if (isOffline) {
      setIsOffline(false);
      if (pendingSync.length === 0) {
        toast("Back online.");
        return;
      }
      const count = pendingSync.length;
      startTransition(async () => {
        await syncStationTaps(pendingSync);
        setPendingSync([]);
        toast(`Back online. ${count} saved ${count === 1 ? "tap was" : "taps were"} uploaded.`);
      });
      return;
    }

    setIsOffline(true);
    toast("Offline. Taps are saved on this device.");
  }

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={
            isOffline
              ? "inline-flex items-center gap-1.5 rounded-full bg-status-late-bg px-2.5 py-1 text-xs font-medium text-status-late"
              : "inline-flex items-center gap-1.5 rounded-full bg-status-present-bg px-2.5 py-1 text-xs font-medium text-status-present"
          }
        >
          {isOffline ? <WifiOff className="size-3.5" aria-hidden="true" /> : <Wifi className="size-3.5" aria-hidden="true" />}
          {isOffline ? "Offline" : "Online"}
        </span>
        <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
          {pendingSync.length} {pendingSync.length === 1 ? "tap" : "taps"} waiting to sync
        </span>
        <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
          {STATION_LABEL}
        </span>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={handleToggleOffline} disabled={isSyncing}>
          {isOffline ? "Go back online" : "Simulate offline"}
        </Button>
      </div>

      <ResultDisplay result={result} />

      <div className="flex flex-col gap-3 border-t border-border pt-6">
        <p className="text-sm font-medium text-muted-foreground">Prototype controls</p>
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
          {SIMULATE_BUTTONS.map(({ kind, label }) => (
            <Button key={kind} type="button" size="lg" variant="secondary" onClick={() => handleSimulate(kind)}>
              {label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

const RESULT_STYLE: Record<"ready" | "present" | "late" | "absent" | "idle", string> = {
  ready: "border-border bg-muted/40 text-foreground",
  present: "border-status-present bg-status-present-bg text-status-present",
  late: "border-status-late bg-status-late-bg text-status-late",
  absent: "border-status-absent bg-status-absent-bg text-status-absent",
  idle: "border-status-idle bg-status-idle-bg text-status-idle",
};

function ResultDisplay({ result }: { result: { outcome: StationTapOutcome; queued: boolean } | null }) {
  const content = describeOutcome(result?.outcome ?? null, result?.queued ?? false);

  return (
    <div
      aria-live="polite"
      className={`flex min-h-56 flex-col items-center justify-center gap-3 rounded-xl border-2 p-8 text-center ${RESULT_STYLE[content.tone]}`}
    >
      <content.Icon className="size-12" aria-hidden="true" />
      <p className="font-heading text-2xl font-bold">{content.title}</p>
      <p className="max-w-sm text-sm">{content.lead}</p>
    </div>
  );
}

function describeOutcome(
  outcome: StationTapOutcome | null,
  queued: boolean,
): {
  tone: keyof typeof RESULT_STYLE;
  Icon: typeof Nfc;
  title: string;
  lead: string;
} {
  if (!outcome) {
    return { tone: "ready", Icon: Nfc, title: "Ready", lead: "Tap an ID card on the reader." };
  }

  if (outcome.status === "empty") {
    const EMPTY_LEAD: Record<StationTapKind, string> = {
      valid: "Nobody is left to tap in right now.",
      duplicate: "Nobody has tapped in yet today.",
      lost: "No card on file is marked lost right now.",
      unknown: "",
    };
    return { tone: "ready", Icon: Nfc, title: "Nothing to simulate", lead: EMPTY_LEAD[outcome.kind] };
  }

  if (outcome.status === "ignored") {
    return {
      tone: "late",
      Icon: RotateCcw,
      title: outcome.studentName,
      lead: `Already tapped in at ${formatTapTime(outcome.existingTap.tappedAt)}. This tap was ignored.`,
    };
  }

  if (outcome.kind === "valid") {
    return {
      tone: "present",
      Icon: CheckCircle2,
      title: outcome.studentName,
      lead: queued
        ? `${outcome.gradeSection} – saved on this device, will sync later`
        : `${outcome.gradeSection} – time in ${formatTapTime(outcome.tap.tappedAt)}`,
    };
  }

  if (outcome.kind === "lost") {
    // Deliberately not naming whose card this is on a screen anyone at the
    // gate can see — the real name is for staff, in the dashboard's "Needs
    // attention" panel, not broadcast here (CLAUDE.md: minors, minimum data).
    return {
      tone: "absent",
      Icon: Ban,
      title: "Lost card",
      lead: queued
        ? "Saved on this device, will sync later. Please see the office."
        : "This card was reported lost. Please see the office.",
    };
  }

  return {
    tone: "idle",
    Icon: HelpCircle,
    title: "Card not registered",
    lead: queued
      ? "Saved on this device, will sync later."
      : "Ask the office to link this card to a student.",
  };
}
