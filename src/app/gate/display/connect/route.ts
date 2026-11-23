import { NextResponse } from "next/server";
import { MONITOR_COOKIE } from "@/features/gate/monitor-viewer";
import { requestOrigin } from "@/lib/request-origin";
import { authenticateDevice } from "@/services/devices/authenticate-device";

/** Browsers keep a cookie at most 400 days. */
const COOKIE_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

/**
 * A guardhouse TV's one-time link (Step 48): /gate/display/connect?key=…
 * Only an active monitor device's key is accepted (a gate records taps;
 * a monitor only watches). The key is swapped for a long-lived httpOnly
 * cookie and the TV is sent on to plain /gate/display, so the key doesn't
 * stay in the address bar. Revoking the device stops that TV.
 *
 * The redirect is built from the site's public address (`requestOrigin`),
 * not from `request.url`: behind Heroku's router the request's own URL is the
 * dyno's internal address, so redirecting to it sent the TV to
 * https://localhost:<port> (P-069).
 */
export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key");
  const device = key ? await authenticateDevice(`Bearer ${key}`) : null;

  const origin = await requestOrigin();

  if (!key || !device || device.kind !== "monitor") {
    return NextResponse.redirect(new URL("/gate/display?error=key", origin));
  }

  const response = NextResponse.redirect(new URL("/gate/display", origin));
  // The address carried a secret: never cache this answer, and never name
  // the address as the referrer of the page it leads to (Step 59.13).
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.cookies.set(MONITOR_COOKIE, key, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}
