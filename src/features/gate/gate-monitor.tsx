"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Nfc } from "lucide-react";
import { StudentAvatar } from "@/features/students/student-display";
import { formatSchoolTime } from "@/lib/school-time";
import { cn } from "@/lib/utils";
import type { GateTapEvent } from "@/services/taps/tap-events";
import { mergeMonitorEvents } from "./monitor-events";

const OUTCOME_TEXT: Record<GateTapEvent["outcome"], string> = {
  recorded: "text-status-present",
  lost_card: "text-status-absent",
  unknown_card: "text-muted-foreground",
};
const OUTCOME_BORDER: Record<GateTapEvent["outcome"], string> = {
  recorded: "border-status-present",
  lost_card: "border-status-absent",
  unknown_card: "border-border",
};

function outcomeLabel(event: GateTapEvent): string {
  if (event.outcome === "lost_card") return "Lost card: see the office";
  if (event.outcome === "unknown_card") return "Card not recognised";
  return event.direction === "time_out" ? "Time out" : "Time in";
}

function MonitorAvatar({ event, className }: { event: GateTapEvent; className: string }) {
  if (!event.student) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground",
          className,
        )}
      >
        <Nfc className="size-1/2" />
      </span>
    );
  }
  return <StudentAvatar student={event.student} photoSrc={event.student.photo} className={className} />;
}

/**
 * The guardhouse monitor's live part (Step 48): today's latest taps from
 * the page, plus every new one as it's stored, over server-sent events.
 * EventSource reconnects by itself; after a reconnect the page reloads its
 * list, so a tap made while disconnected still shows.
 */
export function GateMonitor({ schoolName, loaded }: { schoolName: string; loaded: GateTapEvent[] }) {
  const router = useRouter();
  const [live, setLive] = useState<GateTapEvent[]>([]);
  const [reconnecting, setReconnecting] = useState(false);
  const [now, setNow] = useState(() => new Date().toISOString());

  useEffect(() => {
    const source = new EventSource("/api/v1/gate/stream");
    let dropped = false;
    source.addEventListener("tap", (message) => {
      const event = JSON.parse((message as MessageEvent<string>).data) as GateTapEvent;
      setLive((current) => [event, ...current].slice(0, 30));
    });
    source.onerror = () => {
      dropped = true;
      setReconnecting(true);
    };
    source.onopen = () => {
      setReconnecting(false);
      if (dropped) router.refresh();
    };
    const clock = setInterval(() => setNow(new Date().toISOString()), 15_000);
    return () => {
      source.close();
      clearInterval(clock);
    };
  }, [router]);

  const events = mergeMonitorEvents(live, loaded);
  const [newest, ...earlier] = events;

  return (
    <main className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
        <div>
          <h1 className="font-heading text-lg font-semibold">Gate monitor</h1>
          <p className="text-sm text-muted-foreground">{schoolName}</p>
        </div>
        <div className="flex items-center gap-3">
          {reconnecting ? (
            <span role="status" className="rounded-full bg-status-late-bg px-3 py-1 text-sm text-status-late">
              Reconnecting…
            </span>
          ) : null}
          <p className="font-heading text-2xl font-semibold tabular-nums">{formatSchoolTime(now)}</p>
        </div>
      </header>

      {newest ? (
        <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
          <section
            aria-live="polite"
            aria-label="Newest tap"
            className={cn(
              "flex flex-col items-center gap-6 rounded-3xl border-4 bg-card p-6 text-center sm:flex-row sm:text-left",
              OUTCOME_BORDER[newest.outcome],
            )}
          >
            <MonitorAvatar event={newest} className="size-[min(60vw,15rem)] text-6xl" />
            <div className="flex flex-col gap-2">
              <p className="font-heading text-4xl font-bold">
                {newest.student ? `${newest.student.firstName} ${newest.student.lastName}` : "Unknown card"}
              </p>
              {newest.student ? (
                <p className="text-xl text-muted-foreground">
                  Grade {newest.student.gradeLevel} – {newest.student.section}
                </p>
              ) : null}
              <p className={cn("font-heading text-3xl font-semibold", OUTCOME_TEXT[newest.outcome])}>
                {outcomeLabel(newest)} · {formatSchoolTime(newest.tappedAt)}
              </p>
            </div>
          </section>

          {earlier.length > 0 ? (
            <section aria-labelledby="monitor-earlier">
              <h2
                id="monitor-earlier"
                className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase"
              >
                Earlier
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {earlier.map((event) => (
                  <li key={event.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                    <MonitorAvatar event={event} className="size-14 text-lg" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {event.student ? `${event.student.firstName} ${event.student.lastName}` : "Unknown card"}
                      </p>
                      <p className={cn("text-sm", OUTCOME_TEXT[event.outcome])}>
                        {outcomeLabel(event)} · {formatSchoolTime(event.tappedAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <Nfc className="size-16 text-primary" aria-hidden="true" />
          <p className="font-heading text-3xl font-bold">Waiting for the first tap</p>
          <p className="text-muted-foreground">Taps at the gate appear here as they happen.</p>
        </div>
      )}
    </main>
  );
}
