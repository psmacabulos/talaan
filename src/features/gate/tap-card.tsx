import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  Nfc,
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
 * otherwise. An unknown card is amber too, as a warning (2026-10-13): the
 * same card, but a small card-with-warning icon instead of a portrait, a
 * headline, and an amber panel with the time, since nobody's attendance
 * was recorded.
 */
const KIND: Record<
  TapKind,
  {
    badge: string;
    icon: LucideIcon;
    badgeClass: string;
    listClass: string;
    stamp?: { label: string; className: string; icon?: LucideIcon };
    /** An unknown card: shown in place of the portrait, badge and name. */
    warning?: { headline: string; message: string };
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
    badge: "Unknown card",
    icon: AlertTriangle,
    badgeClass: "bg-status-late-bg text-status-late",
    listClass: "text-status-late",
    stamp: {
      label: "Awaiting staff assistance",
      className: "border border-status-late/30 bg-status-late-bg/60 text-status-late",
      icon: Clock,
    },
    warning: { headline: "Unknown card", message: "This card isn't linked to a registered student." },
  },
  invalid_serial: {
    badge: "Couldn't read the card",
    icon: RotateCcw,
    badgeClass: "bg-status-idle-bg text-status-idle",
    listClass: "text-muted-foreground",
  },
  saved: {
    badge: "Saved on this tablet",
    icon: WifiOff,
    badgeClass: "bg-status-idle-bg text-status-idle",
    listClass: "text-muted-foreground",
  },
};

/** A card with a small warning sign: an unknown card, in place of a portrait. */
export function UnknownCardIcon({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative flex size-14 shrink-0 items-center justify-center rounded-2xl bg-status-late-bg text-status-late",
        className,
      )}
    >
      <CreditCard className="size-1/2" strokeWidth={1.75} />
      <span className="absolute right-[18%] bottom-[18%] flex size-[38%] items-center justify-center rounded-full bg-status-late-bg">
        <AlertTriangle className="size-[80%]" strokeWidth={2.25} />
      </span>
    </span>
  );
}

/** The portrait when there's no student to show: the card symbol, or for an unknown card the warning card. */
export function NoPhotoPortrait({ kind, className }: { kind: TapKind; className?: string }) {
  if (kind === "unknown_card") return <UnknownCardIcon className="size-10 rounded-lg" />;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex aspect-4/5 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground",
        className,
      )}
    >
      <Nfc className="size-1/2" />
    </span>
  );
}

/**
 * The large portrait's classes, shared so the gate and the monitor match.
 * It fills the height of TapCard's portrait box and takes its width from
 * the 4:5 shape, so it shrinks with the box on a short screen (P-051).
 */
export const TAP_CARD_PORTRAIT =
  "absolute top-0 left-1/2 h-full w-auto -translate-x-1/2 rounded-2xl border border-border object-top text-6xl";

/**
 * The big card for the newest tap. `key` it by the tap's id where it's
 * used: a new tap then fades in (200 ms, none with reduced motion), while
 * the same tap's answer arriving updates it in place. Nothing waits for the
 * fade, so the next card read is never held up.
 *
 * In a page that fits the screen, only the portrait gives way when there
 * isn't enough height: it's 300 px tall at most and shrinks from there,
 * while the badge, the name and the time always show in full (P-051).
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
    <div className="flex min-h-0 w-full max-w-md animate-in flex-col items-center gap-5 rounded-3xl border border-border bg-card p-6 text-center shadow-[var(--shadow-card)] duration-200 fade-in-0 motion-reduce:animate-none sm:p-8 short:gap-3 short:p-4">
      {style.warning ? (
        <>
          <UnknownCardIcon />
          <div className="flex w-full flex-col gap-2">
            <p className="font-heading text-[1.75rem] leading-tight font-bold text-foreground sm:text-3xl">
              {style.warning.headline}
            </p>
            <p className="text-base text-muted-foreground">{style.warning.message}</p>
          </div>
        </>
      ) : (
        <>
          {/* 300 px tall, or 70vw on a narrow phone, and allowed to shrink. */}
          <div className="relative min-h-0 w-full flex-[0_1_min(18.75rem,70vw)]">{portrait}</div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium",
              style.badgeClass,
            )}
          >
            <Icon
              className={cn("size-4", kind === "checking" && "animate-spin motion-reduce:animate-none")}
              aria-hidden="true"
            />
            {style.badge}
          </span>
        </>
      )}

      {name ? (
        <div className="flex w-full flex-col gap-1">
          <p className="font-heading text-2xl leading-tight font-bold break-words text-foreground sm:text-3xl">
            {name}
          </p>
          {grade ? <p className="text-base text-muted-foreground">{grade}</p> : null}
        </div>
      ) : null}

      {/* Always the same height, so the card doesn't jump as an answer arrives. */}
      <div className="flex min-h-[5.5rem] w-full flex-col justify-center border-t border-border pt-5 short:min-h-18 short:pt-3">
        {style.stamp && stampAt ? (
          <div className={cn("rounded-xl px-4 py-3 short:py-2", style.stamp.className)}>
            {style.stamp.icon ? (
              <p className="inline-flex items-center gap-1.5 text-sm font-medium">
                <style.stamp.icon className="size-4" aria-hidden="true" />
                {style.stamp.label}
              </p>
            ) : (
              <p className="text-xs font-semibold tracking-wide uppercase">{style.stamp.label}</p>
            )}
            <p className="font-heading text-[1.75rem] leading-tight font-bold tabular-nums">
              {formatSchoolTime(stampAt)}
            </p>
          </div>
        ) : (
          <p className={cn("text-base", kind === "lost_card" ? "text-status-absent" : "text-muted-foreground")}>
            {detail ?? ""}
          </p>
        )}
        {/* An unknown card has both: the time above, and what to do here. */}
        {style.warning && stampAt && detail ? <p className="mt-3 text-sm text-muted-foreground">{detail}</p> : null}
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
