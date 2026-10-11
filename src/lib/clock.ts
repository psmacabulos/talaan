/**
 * "Now" for the whole app. Normally the real time. DEMO_NOW pins it to one
 * instant, so the browser tests see the demo morning on every run
 * (DEMO_NOW="2026-06-20T09:15:00+08:00"). Never set on a real server; when
 * it is set, staff pages show a "Demo clock" badge, so it can't go unnoticed.
 */
export function getNow(): string {
  const pinned = process.env.DEMO_NOW;
  if (!pinned) return new Date().toISOString();

  const instant = Date.parse(pinned);
  if (Number.isNaN(instant)) {
    throw new Error(`DEMO_NOW isn't a date and time: "${pinned}". Use the form 2026-06-20T09:15:00+08:00.`);
  }
  return new Date(instant).toISOString();
}

/** Whether DEMO_NOW is pinning the clock (for the badge, and for the tap station's own clock). */
export function isDemoClock(): boolean {
  return Boolean(process.env.DEMO_NOW);
}
