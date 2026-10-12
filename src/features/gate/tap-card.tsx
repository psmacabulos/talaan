import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  Clock,
  Loader2,
  RotateCcw,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { formatSchoolTime } from "@/lib/school-time";
import { cn } from "@/lib/utils";
import type { TapKind } from "./gate-display";

/**
 * How each kind of tap looks, on the gate and on the guardhouse monitor
 * alike (2026-10-12): a white card with the portrait, a small badge, the
 * name, and either a time stamp or what to do next. Only the fixed status
 * colours are used, never the school's theme: green for a time in, blue
 * for a time out, amber for already tapped, red for a lost card, grey
 * otherwise.
 */
const KIND: Record<
  TapKind,
  {
    badge: string;
    icon: LucideIcon;
    badgeClass: string;
    listClass: string;
    stamp?: { label: string; className: string };
  }
> = {
  checking: {
    badge: "Checking…",
    icon: Loader2,
    badgeClass: "bg-status-idle-bg text-status-idle",
    listClass: "text-muted-foreground",
  },
  time_in: {
    badge: "Attendance recorded",
    icon: CheckCircle2,
    badgeClass: "bg-status-present-bg text-status-present",
    listClass: "text-status-present",
    stamp: { label: "Time in", className: "bg-status-present-bg text-status-present" },
  },
  time_out: {
    badge: "Attendance recorded",
    icon: CheckCircle2,
    badgeClass: "bg-status-present-bg text-status-present",
    listClass: "text-status-out",
    stamp: { label: "Time out", className: "bg-status-out-bg text-status-out" },
  },
  duplicate: {
    badge: "Already tapped",
    icon: Clock,
    badgeClass: "bg-status-late-bg text-status-late",
    listClass: "text-status-late",
    stamp: { label: "First tapped at", className: "bg-status-late-bg text-status-late" },
  },
  lost_card: {
    badge: "Card reported lost",
    icon: AlertTriangle,
    badgeClass: "bg-status-absent-bg text-status-absent",
    listClass: "text-status-absent",
  },
  unknown_card: {
    badge: "Card not recognised",
    icon: CircleHelp,
    badgeClass: "bg-status-idle-bg text-status-idle",
    listClass: "text-muted-foreground",
  },
  invalid_serial: {
    badge: "Couldn't read the card",
    icon: RotateCcw,
    badgeClass: "bg-status-idle-bg text-status-idle",
    listClass: "text-muted-foreground",
  },
  not_sent: {
    badge: "Not sent",
    icon: WifiOff,
    badgeClass: "bg-status-idle-bg text-status-idle",
    listClass: "text-muted-foreground",
  },
};

/** The large portrait's classes, shared so the gate and the monitor match. */
export const TAP_CARD_PORTRAIT = "w-[min(56vw,15rem)] rounded-2xl border border-border object-top text-6xl";

/**
 * The big card for the newest tap. `key` it by the tap's id where it's
 * used: a new tap then fades in (200 ms, none with reduced motion), while
 * the same tap's answer arriving updates it in place. Nothing waits for the
 * fade, so the next card read is never held up.
 */
export function TapCard({
  kind,
  name,
  grade,
  stampAt,
  detail,
  portrait,
}: {
  kind: TapKind;
  name: string | null;
  grade: string | null;
  stampAt: string | null;
  detail: string | null;
  portrait: ReactNode;
}) {
  const style = KIND[kind];
  const Icon = style.icon;

  return (
    <div className="flex w-full max-w-md animate-in flex-col items-center gap-5 rounded-3xl border border-border bg-card p-6 text-center shadow-[var(--shadow-card)] duration-200 fade-in-0 motion-reduce:animate-none sm:p-8">
      {portrait}

      <span
        className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium", style.badgeClass)}
      >
        <Icon
          className={cn("size-4", kind === "checking" && "animate-spin motion-reduce:animate-none")}
          aria-hidden="true"
        />
        {style.badge}
      </span>

      {name ? (
        <div className="flex w-full flex-col gap-1">
          <p className="font-heading text-2xl leading-tight font-bold break-words text-foreground sm:text-3xl">
            {name}
          </p>
          {grade ? <p className="text-base text-muted-foreground">{grade}</p> : null}
        </div>
      ) : null}

      {/* Always the same height, so the card doesn't jump as an answer arrives. */}
      <div className="flex min-h-[5.5rem] w-full flex-col justify-center border-t border-border pt-5">
        {style.stamp && stampAt ? (
          <div className={cn("rounded-xl px-4 py-3", style.stamp.className)}>
            <p className="text-xs font-semibold tracking-wide uppercase">{style.stamp.label}</p>
            <p className="font-heading text-[1.75rem] leading-tight font-bold tabular-nums">
              {formatSchoolTime(stampAt)}
            </p>
          </div>
        ) : (
          <p className={cn("text-base", kind === "lost_card" ? "text-status-absent" : "text-muted-foreground")}>
            {detail ?? ""}
          </p>
        )}
      </div>
    </div>
  );
}

/** One row of the gate's Recent list and the monitor's Earlier list. */
export function TapListItem({
  kind,
  name,
  label,
  at,
  portrait,
}: {
  kind: TapKind;
  name: string | null;
  /** "Time in", "Already tapped", … */
  label: string;
  at: string;
  portrait: ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5">
      {portrait}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{name ?? "Unknown card"}</p>
        <p className={cn("text-xs tabular-nums", KIND[kind].listClass)}>
          {label} · {formatSchoolTime(at)}
        </p>
      </div>
    </li>
  );
}
