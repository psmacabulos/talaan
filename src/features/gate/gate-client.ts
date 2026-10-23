import type { GateTapResponse } from "./responses";
import type { GateRoster } from "./roster";
import type { GateTapRequest } from "./schemas";

/**
 * Everything the `/gate` page keeps on the tablet (Step 47), and the calls
 * it makes. Only what the screen shows is kept: the token, the gate's label
 * and school, the roster (names, grades, sections, photo addresses) and
 * photo thumbnails. All of it is wiped when the token stops working, except
 * the taps still waiting to be sent (Step 58, `tap-queue.ts`).
 */
const TOKEN_KEY = "talaan.gate.token";
const DEVICE_KEY = "talaan.gate.device";
const ROSTER_KEY = "talaan.gate.roster";
const PHOTO_CACHE = "talaan-gate-photos";
/** How many photos to download at once on the first sync: quick, without flooding a school's connection. */
const PHOTO_DOWNLOADS_AT_ONCE = 6;
/** A tap with no answer by now is treated as not sent, so a hanging request can't hold up the line (Step 58). */
const TAP_TIMEOUT_MS = 10_000;

/**
 * No connection, no answer in time, or a server that isn't there just now
 * (502, 503 or 504, which Heroku answers while restarting, and 429): the
 * tap waits, and this doesn't count against it (Step 58).
 */
export class GateOfflineError extends Error {}
/**
 * Any other error answer (500, a 4xx): the tap waits, and it counts
 * against it, so one the server keeps refusing ends up stuck instead of
 * holding up the line. Never a reason to delete it: a school's web filter
 * or login page can answer a 4xx too (Step 58's code review).
 */
export class GateServerError extends Error {}
/** The token no longer works (revoked, or never did): the page goes back to setup. */
export class GateUnauthorizedError extends Error {}

export type StoredRoster = { etag: string | null; roster: GateRoster };

/** Who this gate is, from its last good check-in: enough to start without the server (Step 58). */
export type StoredDevice = { label: string; schoolId: string };

/** localStorage can be missing or throw (private mode, blocked storage); the gate then just keeps nothing. */
export function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readToken(): string | null {
  return storage()?.getItem(TOKEN_KEY) ?? null;
}

/** Keeps the token. A different one forgets the saved gate, so an offline start never uses another token's school (Step 58). */
export function saveToken(token: string): void {
  if (readToken() !== token) storage()?.removeItem(DEVICE_KEY);
  storage()?.setItem(TOKEN_KEY, token);
}

export function readStoredDevice(): StoredDevice | null {
  try {
    const raw = storage()?.getItem(DEVICE_KEY);
    const device = raw ? (JSON.parse(raw) as Partial<StoredDevice>) : null;
    return typeof device?.label === "string" && typeof device.schoolId === "string"
      ? { label: device.label, schoolId: device.schoolId }
      : null;
  } catch {
    return null;
  }
}

function saveDevice(device: StoredDevice): void {
  try {
    storage()?.setItem(DEVICE_KEY, JSON.stringify(device));
  } catch {
    // Storage full or blocked: the gate still works while it can reach the server.
  }
}

/** Asks the browser not to clear this site's storage when space runs low, where it can (Step 58). */
export function askToKeepStorage(): void {
  void navigator.storage?.persist?.().catch(() => undefined);
}

export function readStoredRoster(): StoredRoster | null {
  try {
    const raw = storage()?.getItem(ROSTER_KEY);
    return raw ? (JSON.parse(raw) as StoredRoster) : null;
  } catch {
    return null;
  }
}

/**
 * Forgets the token, the gate, the roster and every photo: Disconnect, or a
 * revoked token. Never the waiting taps: the server hasn't got them, and a
 * token of the same school sends them later (Step 58).
 */
export async function forgetGate(): Promise<void> {
  storage()?.removeItem(TOKEN_KEY);
  storage()?.removeItem(DEVICE_KEY);
  storage()?.removeItem(ROSTER_KEY);
  if ("caches" in window) await caches.delete(PHOTO_CACHE);
}

function authorized(token: string, extra: Record<string, string> = {}): HeadersInit {
  return { Authorization: `Bearer ${token}`, ...extra };
}

/**
 * Checks the token (Step 43's heartbeat), at start-up and until it works.
 * A good answer is kept, so a later start-up can begin without the server.
 */
export async function checkIn(token: string): Promise<StoredDevice & { serverTime: string }> {
  const response = await fetch("/api/v1/devices/heartbeat", { method: "POST", headers: authorized(token) });
  if (response.status === 401) throw new GateUnauthorizedError();
  if (!response.ok) throw new Error(`Check-in failed: ${response.status}`);
  const body = (await response.json()) as {
    device: { label: string; kind: string; schoolId: string };
    serverTime: string;
  };
  if (body.device.kind !== "gate") throw new GateUnauthorizedError();
  const device = { label: body.device.label, schoolId: body.device.schoolId };
  saveDevice(device);
  return { ...device, serverTime: body.serverTime };
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

/**
 * Sends one tap, and says which way it failed (Step 58): no connection, no
 * answer in time or a server that isn't there just now; an error answer;
 * or a token that no longer works. A resend with the same id gets the first
 * answer back, so a tap that timed out but was stored is never doubled.
 */
export async function sendTap(token: string, tap: GateTapRequest): Promise<GateTapResponse> {
  let response: Response;
  try {
    response = await fetch("/api/v1/gate/taps", {
      method: "POST",
      headers: authorized(token, { "Content-Type": "application/json" }),
      body: JSON.stringify(tap),
      // Older WebViews lack AbortSignal.timeout: those wait for the browser's own limit.
      signal: typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(TAP_TIMEOUT_MS) : undefined,
    });
  } catch {
    throw new GateOfflineError();
  }
  if (response.status === 401 || response.status === 403) throw new GateUnauthorizedError();
  if ([429, 502, 503, 504].includes(response.status)) throw new GateOfflineError();
  if (!response.ok) throw new GateServerError(`Tap failed: ${response.status}`);
  try {
    return (await response.json()) as GateTapResponse;
  } catch {
    // The answer was cut off on its way: the tap may be stored, and a resend says so.
    throw new GateOfflineError();
  }
}

async function inBatches<T>(items: T[], size: number, work: (item: T) => Promise<void>): Promise<void> {
  for (let start = 0; start < items.length; start += size) {
    await Promise.all(items.slice(start, start + size).map(work));
  }
}

/**
 * Every roster photo already on the tablet, without the network: for a
 * start-up while the server can't be reached (Step 58).
 */
export async function photosFromCache(roster: GateRoster): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  if (!("caches" in window)) return urls;
  const cache = await caches.open(PHOTO_CACHE);
  for (const student of roster.students) {
    if (!student.photo) continue;
    const response = await cache.match(student.photo);
    if (response) urls.set(student.photo, URL.createObjectURL(await response.blob()));
  }
  return urls;
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
