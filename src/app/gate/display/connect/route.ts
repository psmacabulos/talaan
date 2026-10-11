import { NextResponse } from "next/server";
import { MONITOR_COOKIE } from "@/features/gate/monitor-viewer";
import { authenticateDevice } from "@/services/devices/authenticate-device";

/** Browsers keep a cookie at most 400 days. */
const COOKIE_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

/**
 * A guardhouse TV's one-time link (Step 48): /gate/display/connect?key=…
 * Only an active monitor device's key is accepted (a gate records taps;
 * a monitor only watches). The key is swapped for a long-lived httpOnly
 * cookie and the TV is sent on to plain /gate/display, so the key doesn't
 * stay in the address bar. Revoking the device stops that TV.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key");
  const device = key ? await authenticateDevice(`Bearer ${key}`) : null;

  if (!key || !device || device.kind !== "monitor") {
    return NextResponse.redirect(new URL("/gate/display?error=key", url));
  }

  const response = NextResponse.redirect(new URL("/gate/display", url));
  response.cookies.set(MONITOR_COOKIE, key, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}
