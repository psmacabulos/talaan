"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Nfc } from "lucide-react";
import { StudentAvatar } from "@/features/students/student-display";
import { formatSchoolTime } from "@/lib/school-time";
import type { GateTapEvent } from "@/services/taps/tap-events";
import { UNKNOWN_CARD_MONITOR_DETAIL, type TapKind } from "./gate-display";
import { mergeMonitorEvents } from "./monitor-events";
import { NoPhotoPortrait, TAP_CARD_PORTRAIT, TapCard, TapListItem } from "./tap-card";

/** A monitor event as a tap card kind (`tap-card.tsx`), so the monitor and the gate look alike. */
function kindOf(event: GateTapEvent): TapKind {
  if (event.outcome === "recorded") return event.direction === "time_out" ? "time_out" : "time_in";
  return event.outcome;
}

function outcomeLabel(event: GateTapEvent): string {
  if (event.outcome === "lost_card") return "Lost card: see the office";
  if (event.outcome === "unknown_card") return "Check this person";
  return event.direction === "time_out" ? "Time out" : "Time in";
}

/** What the guard should do, under the badge, when there's no time stamp. */
function detailOf(event: GateTapEvent): string | null {
  if (event.outcome === "unknown_card") return UNKNOWN_CARD_MONITOR_DETAIL;
  if (event.outcome === "lost_card") return "Please see the office.";
  return null;
}

function nameOf(event: GateTapEvent): string | null {
  return event.student ? `${event.student.firstName} ${event.student.lastName}` : null;
}

function MonitorAvatar({ event, className }: { event: GateTapEvent; className: string }) {
  if (!event.student) return <NoPhotoPortrait kind={kindOf(event)} className={className} />;
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
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 sm:px-6">
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
          <section aria-live="polite" aria-label="Newest tap" className="flex justify-center">
            <TapCard
              key={newest.id}
              kind={kindOf(newest)}
              name={nameOf(newest)}
              grade={newest.student ? `Grade ${newest.student.gradeLevel} – ${newest.student.section}` : null}
              stampAt={newest.outcome === "lost_card" ? null : newest.tappedAt}
              detail={detailOf(newest)}
              portrait={<MonitorAvatar event={newest} className={TAP_CARD_PORTRAIT} />}
            />
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
                  <TapListItem
                    key={event.id}
                    kind={kindOf(event)}
                    name={nameOf(event)}
                    label={outcomeLabel(event)}
                    at={event.tappedAt}
                    portrait={<MonitorAvatar event={event} className="w-10" />}
                  />
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
