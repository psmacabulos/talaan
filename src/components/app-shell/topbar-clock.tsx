"use client";

import { useEffect, useState } from "react";
import { formatSchoolDay, formatSchoolTime, toSchoolOffsetIso } from "@/lib/school-time";

const MINUTE_MS = 60_000;

/**
 * Today's date and time on the school's clock (Step 59.9). The server
 * writes the time into the page it is already sending; from then on the
 * browser moves it forward by the time passed on this device, so the clock
 * costs no requests, and a device set to the wrong time still shows the
 * right one. A pinned demo clock (DEMO_NOW) stays still, like the rest of
 * the page. The parent passes `key={serverNow}`, so a fresh server time
 * (a refresh) starts it over.
 */
export function TopbarClock({ serverNow, pinned }: { serverNow: string; pinned: boolean }) {
  const [now, setNow] = useState(serverNow);

  useEffect(() => {
    if (pinned) return;

    const serverMs = Date.parse(serverNow);
    const loadedAt = Date.now();
    const current = () => serverMs + (Date.now() - loadedAt);
    let timer: ReturnType<typeof setTimeout>;

    // Wakes once each minute turns over, not every second.
    function scheduleNextMinute() {
      timer = setTimeout(update, MINUTE_MS - (current() % MINUTE_MS));
    }
    function update() {
      setNow(new Date(current()).toISOString());
      scheduleNextMinute();
    }
    // A laptop waking from sleep shows the right time at once.
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      clearTimeout(timer);
      update();
    }

    scheduleNextMinute();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [serverNow, pinned]);

  // Not a live region: a screen reader announcing every minute would be noise.
  // The date truncates before the time does on a narrow top bar.
  return (
    <time
      dateTime={toSchoolOffsetIso(now)}
      className="flex min-w-0 flex-1 items-baseline gap-2 font-heading text-base font-semibold tabular-nums text-foreground sm:text-lg"
    >
      <span className="truncate">
        <span className="xl:hidden">{formatSchoolDay(now, "short")}</span>
        <span className="hidden xl:inline">{formatSchoolDay(now, "long")}</span>
      </span>
      <span aria-hidden="true" className="text-muted-foreground">
        ·
      </span>
      <span className="shrink-0">{formatSchoolTime(now)}</span>
    </time>
  );
}
