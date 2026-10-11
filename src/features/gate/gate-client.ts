import type { GateTapResponse } from "./responses";
import type { GateRoster } from "./roster";
import type { GateTapRequest } from "./schemas";

/**
 * Everything the `/gate` page keeps on the tablet (Step 47), and the calls
 * it makes. Only what the screen shows is kept: the token, the roster
 * (names, grades, sections, photo addresses) and photo thumbnails. All of
 * it is wiped when the token stops working.
 */
const TOKEN_KEY = "talaan.gate.token";
const ROSTER_KEY = "talaan.gate.roster";
const PHOTO_CACHE = "talaan-gate-photos";
/** How many photos to download at once on the first sync: quick, without flooding a school's connection. */
const PHOTO_DOWNLOADS_AT_ONCE = 6;

/** The token no longer works (revoked, or never did): the page goes back to setup. */
export class GateUnauthorizedError extends Error {}

export type StoredRoster = { etag: string | null; roster: GateRoster };

/** localStorage can be missing or throw (private mode, blocked storage); the gate then just keeps nothing. */
function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readToken(): string | null {
  return storage()?.getItem(TOKEN_KEY) ?? null;
}

export function saveToken(token: string): void {
  storage()?.setItem(TOKEN_KEY, token);
}

export function readStoredRoster(): StoredRoster | null {
  try {
    const raw = storage()?.getItem(ROSTER_KEY);
    return raw ? (JSON.parse(raw) as StoredRoster) : null;
  } catch {
    return null;
  }
}

/** Forgets the token, the roster and every photo: Disconnect, or a revoked token. */
export async function forgetGate(): Promise<void> {
  storage()?.removeItem(TOKEN_KEY);
  storage()?.removeItem(ROSTER_KEY);
  if ("caches" in window) await caches.delete(PHOTO_CACHE);
}

function authorized(token: string, extra: Record<string, string> = {}): HeadersInit {
  return { Authorization: `Bearer ${token}`, ...extra };
}

/** Checks the token once, at setup (Step 43's heartbeat). */
export async function checkIn(token: string): Promise<{ label: string; serverTime: string }> {
  const response = await fetch("/api/v1/devices/heartbeat", { method: "POST", headers: authorized(token) });
  if (response.status === 401) throw new GateUnauthorizedError();
  if (!response.ok) throw new Error(`Check-in failed: ${response.status}`);
  const body = (await response.json()) as { device: { label: string; kind: string }; serverTime: string };
  if (body.device.kind !== "gate") throw new GateUnauthorizedError();
  return { label: body.device.label, serverTime: body.serverTime };
}

/** Asks "anything new?" with the last ETag; a 304 keeps the stored copy and costs a few bytes. */
export async function refreshRoster(token: string, stored: StoredRoster | null): Promise<StoredRoster> {
  const headers = authorized(token, stored?.etag ? { "If-None-Match": stored.etag } : {});
  const response = await fetch("/api/v1/gate/roster", { headers, cache: "no-store" });
  if (response.status === 401 || response.status === 403) throw new GateUnauthorizedError();
  if (response.status === 304 && stored) return stored;
  if (!response.ok) throw new Error(`Roster failed: ${response.status}`);

  const fresh: StoredRoster = { etag: response.headers.get("etag"), roster: (await response.json()) as GateRoster };
  try {
    storage()?.setItem(ROSTER_KEY, JSON.stringify(fresh));
  } catch {
    // Storage full or blocked: the roster still works for this session.
  }
  return fresh;
}

/** Sends one tap. Never waits for any other tap. */
export async function sendTap(token: string, tap: GateTapRequest): Promise<GateTapResponse> {
  const response = await fetch("/api/v1/gate/taps", {
    method: "POST",
    headers: authorized(token, { "Content-Type": "application/json" }),
    body: JSON.stringify(tap),
  });
  if (response.status === 401 || response.status === 403) throw new GateUnauthorizedError();
  if (!response.ok) throw new Error(`Tap failed: ${response.status}`);
  return (await response.json()) as GateTapResponse;
}

async function inBatches<T>(items: T[], size: number, work: (item: T) => Promise<void>): Promise<void> {
  for (let start = 0; start < items.length; start += size) {
    await Promise.all(items.slice(start, start + size).map(work));
  }
}

/**
 * Makes sure every roster photo is on the tablet, and returns where each one
 * can be shown from (an object URL per photo address). A photo already in
 * the cache isn't downloaded again; a new photo has a new address, so only
 * that one is fetched. Photos no longer in the roster are deleted.
 */
export async function syncPhotos(token: string, roster: GateRoster): Promise<Map<string, string>> {
  const wanted = roster.students.flatMap((student) => (student.photo ? [student.photo] : []));
  const urls = new Map<string, string>();
  const cache = "caches" in window ? await caches.open(PHOTO_CACHE) : null;

  await inBatches(wanted, PHOTO_DOWNLOADS_AT_ONCE, async (path) => {
    let response = cache ? await cache.match(path) : undefined;
    if (!response) {
      const fetched = await fetch(path, { headers: authorized(token) });
      if (fetched.status === 401) throw new GateUnauthorizedError();
      if (!fetched.ok) return;
      if (cache) await cache.put(path, fetched.clone());
      response = fetched;
    }
    urls.set(path, URL.createObjectURL(await response.blob()));
  });

  if (cache) {
    const keep = new Set(wanted.map((path) => new URL(path, window.location.origin).href));
    for (const request of await cache.keys()) {
      if (!keep.has(request.url)) await cache.delete(request);
    }
  }
  return urls;
}
