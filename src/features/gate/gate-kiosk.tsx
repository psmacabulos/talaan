"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { Loader2, Nfc } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StudentAvatar } from "@/features/students/student-display";
import { formatSchoolDate, formatSchoolTime } from "@/lib/school-time";
import {
  askToKeepStorage,
  checkIn,
  forgetGate,
  GateUnauthorizedError,
  photosFromCache,
  readStoredDevice,
  readStoredRoster,
  readToken,
  refreshRoster,
  saveToken,
  sendTap,
  storage,
  syncPhotos,
  type StoredRoster,
} from "./gate-client";
import { describeScan, type GateScan, type TapKind } from "./gate-display";
import { createRepeatFilter } from "./repeat-filter";
import { findRosterStudent } from "./roster-match";
import { createScanBuffer } from "./scan-buffer";
import { NoPhotoPortrait, TAP_CARD_PORTRAIT, TapCard, TapListItem } from "./tap-card";
import { readQueue, writeQueue } from "./tap-queue";
import { createTapSender, type QueueSummary, type TapSender } from "./tap-sender";

/** After this long with no new tap, the big panel tidies back to "Tap your card". It never holds up a tap. */
const IDLE_AFTER_MS = 5_000;
const ROSTER_EVERY_MS = 5 * 60_000;
/** While taps wait, or the server couldn't be reached at start-up, try again this often (Step 58). */
const RETRY_EVERY_MS = 30_000;
/** Taps the server kept refusing are tried again this often (Step 58). */
const STUCK_EVERY_MS = 10 * 60_000;
/** A tablet clock this far off gets a warning; the server corrects badly wrong times anyway (Step 45). */
const CLOCK_WARNING_MS = 2 * 60_000;
const RECENT_COUNT = 6;

type NdefReaderLike = { scan(): Promise<void>; onreading: ((event: { serialNumber: string }) => void) | null };

/** Android Chrome's built-in NFC (Web NFC), where the browser has it. */
function ndefReaderClass(): (new () => NdefReaderLike) | undefined {
  return (window as unknown as { NDEFReader?: new () => NdefReaderLike }).NDEFReader;
}

/** Web NFC support never changes while the page is open, so there is nothing to subscribe to. */
const noSubscription = () => () => undefined;

/**
 * Tells React when this browser window gains or loses the keyboard (2026-10-12).
 * Used with `document.hasFocus()` to show the "can't reach this page" banner.
 */
function subscribeToWindowFocus(onChange: () => void): () => void {
  window.addEventListener("focus", onChange);
  window.addEventListener("blur", onChange);
  return () => {
    window.removeEventListener("focus", onChange);
    window.removeEventListener("blur", onChange);
  };
}

type Phase = { kind: "starting" } | { kind: "setup"; error: string | null } | { kind: "ready"; label: string };

/** "1 tap", "3 taps". */
function taps(count: number): string {
  return count === 1 ? "1 tap" : `${count} taps`;
}

/**
 * The gate tablet's screen (Step 47, docs/GATE.md). Signed in by its own
 * device token, never a staff login. Every card read is saved on the
 * tablet, then sent (Step 58): at once when nothing else is waiting,
 * without waiting for any earlier tap, or in its turn when the connection
 * was lost. The photo and name show at once from the tablet's own roster
 * while the server decides.
 */
export function GateKiosk() {
  const [phase, setPhase] = useState<Phase>({ kind: "starting" });
  const [roster, setRoster] = useState<StoredRoster | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Map<string, string>>(new Map());
  const [scans, setScans] = useState<GateScan[]>([]);
  const [showCurrent, setShowCurrent] = useState(false);
  const [clockOffMinutes, setClockOffMinutes] = useState<number | null>(null);
  const [now, setNow] = useState(() => new Date().toISOString());
  // False on the server and on browsers without Web NFC; read once in the browser.
  const nfcSupported = useSyncExternalStore(
    noSubscription,
    () => Boolean(ndefReaderClass()),
    () => false,
  );
  // The reader types into whichever window has the keyboard. When it's
  // another window (the terminal, the address bar), taps would vanish
  // without a trace, so the page says so instead.
  // On the server there's no window, so it assumes true (no banner).
  const pageHasKeyboard = useSyncExternalStore(
    subscribeToWindowFocus,
    () => document.hasFocus(),
    () => true,
  );
  const [nfcOn, setNfcOn] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [queueSummary, setQueueSummary] = useState<QueueSummary | null>(null);
  /** False after a start-up the server couldn't answer, until a check-in works (Step 58). */
  const [serverReached, setServerReached] = useState(true);

  const tokenRef = useRef<string | null>(null);
  const rosterRef = useRef<StoredRoster | null>(null);
  /** The roster whose photos this page has loaded; null until the first load. */
  const photosLoadedFor = useRef<StoredRoster | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const senderRef = useRef<TapSender | null>(null);
  const checkInTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  // One per page: the same card read again within 5 seconds isn't sent (Step 56).
  const [repeatFilter] = useState(createRepeatFilter);

  /** A scan's new state, whenever its answer comes: even a tap saved an hour ago, still in the Recent list. */
  const settleScan = useCallback((id: string, state: GateScan["state"]) => {
    setScans((current) => current.map((existing) => (existing.id === id ? { ...existing, state } : existing)));
  }, []);

  const disconnect = useCallback(async (error: string | null) => {
    tokenRef.current = null;
    rosterRef.current = null;
    photosLoadedFor.current = null;
    // The waiting taps stay on the tablet: forgetGate() keeps them (Step 58).
    senderRef.current?.stop();
    senderRef.current = null;
    if (checkInTimer.current) clearInterval(checkInTimer.current);
    checkInTimer.current = null;
    setQueueSummary(null);
    setServerReached(true);
    await forgetGate();
    setPhotoUrls((current) => {
      current.forEach((url) => URL.revokeObjectURL(url));
      return new Map();
    });
    setRoster(null);
    setScans([]);
    setConfirmDisconnect(false);
    setPhase({ kind: "setup", error });
  }, []);

  const loadRoster = useCallback(
    async (token: string) => {
      try {
        const fresh = await refreshRoster(token, rosterRef.current);
        // "Nothing changed" means nothing to do only once this page has
        // loaded the photos. Right after a reload the roster comes from the
        // tablet's storage and the server answers "unchanged", but no photo
        // is on screen yet; returning here showed initials for everyone
        // (found 2026-10-12).
        if (fresh === rosterRef.current && photosLoadedFor.current === fresh) return;
        rosterRef.current = fresh;
        setRoster(fresh);
        const urls = await syncPhotos(token, fresh.roster);
        photosLoadedFor.current = fresh;
        setPhotoUrls((current) => {
          current.forEach((url) => URL.revokeObjectURL(url));
          return urls;
        });
      } catch (error) {
        if (error instanceof GateUnauthorizedError)
          await disconnect("This gate was disconnected. Ask the office for a new token.");
        // Anything else (offline, a server hiccup): keep the copy already on the tablet and try again later.
      }
    },
    [disconnect],
  );

  /** The tablet's waiting line for this school, sending with this token (Step 58). */
  const startSender = useCallback(
    (token: string, schoolId: string) => {
      const sender = createTapSender({
        schoolId,
        load: () => readQueue(storage()),
        save: (queue) => writeQueue(storage(), queue),
        send: (tap) => sendTap(token, { clientTapId: tap.id, cardSerial: tap.raw, clientTappedAt: tap.scannedAt }),
        onAnswer: (id, response) => settleScan(id, { kind: "answered", response }),
        onUnsent: (id) => settleScan(id, { kind: "saved" }),
        onUnauthorized: () => void disconnect("This gate was disconnected. Ask the office for a new token."),
        onChange: setQueueSummary,
      });
      senderRef.current = sender;
      setQueueSummary(sender.summary());
      return sender;
    },
    [disconnect, settleScan],
  );

  /** A check-in worked: the clock warning, then a fresh roster, and anything waiting goes out. */
  const checkedIn = useCallback(
    async (token: string, serverTime: string) => {
      const offBy = Date.now() - Date.parse(serverTime);
      setClockOffMinutes(Math.abs(offBy) > CLOCK_WARNING_MS ? Math.round(offBy / 60_000) : null);
      setServerReached(true);
      await loadRoster(token);
      senderRef.current?.kick();
    },
    [loadRoster],
  );

  const connect = useCallback(
    async (token: string) => {
      askToKeepStorage();
      try {
        const { label, schoolId, serverTime } = await checkIn(token);
        tokenRef.current = token;
        saveToken(token);
        rosterRef.current = readStoredRoster();
        setRoster(rosterRef.current);
        startSender(token, schoolId);
        setPhase({ kind: "ready", label });
        await checkedIn(token, serverTime);
      } catch (error) {
        if (error instanceof GateUnauthorizedError) {
          await disconnect("That token doesn't work. Ask the office for a new one.");
          return;
        }
        // The server can't answer, but this tablet has been set up before
        // with this same token: start from its own copies, and keep checking
        // in (Step 58). A different token never borrows the saved school.
        const device = readToken() === token ? readStoredDevice() : null;
        if (!device) {
          setPhase({ kind: "setup", error: "Couldn't reach the server. Check the connection and try again." });
          return;
        }
        tokenRef.current = token;
        const stored = readStoredRoster();
        rosterRef.current = stored;
        setRoster(stored);
        startSender(token, device.schoolId);
        setServerReached(false);
        setPhase({ kind: "ready", label: device.label });
        if (stored) {
          const urls = await photosFromCache(stored.roster);
          setPhotoUrls((current) => {
            current.forEach((url) => URL.revokeObjectURL(url));
            return urls;
          });
        }
        if (checkInTimer.current) clearInterval(checkInTimer.current);
        checkInTimer.current = setInterval(() => {
          checkIn(token).then(
            ({ schoolId, serverTime }) => {
              if (checkInTimer.current) clearInterval(checkInTimer.current);
              checkInTimer.current = null;
              // The server's word on the school wins over the saved one.
              if (senderRef.current?.schoolId !== schoolId) {
                senderRef.current?.stop();
                startSender(token, schoolId);
              }
              void checkedIn(token, serverTime);
            },
            (retryError) => {
              if (retryError instanceof GateUnauthorizedError)
                void disconnect("This gate was disconnected. Ask the office for a new token.");
            },
          );
        }, RETRY_EVERY_MS);
      }
    },
    [checkedIn, disconnect, startSender],
  );

  // The start-up check-in retry (Step 58) ends with the page.
  useEffect(
    () => () => {
      if (checkInTimer.current) clearInterval(checkInTimer.current);
    },
    [],
  );

  // First visit: a ?token= link connects once and then leaves the address bar.
  useEffect(() => {
    const url = new URL(window.location.href);
    const fromLink = url.searchParams.get("token");
    if (fromLink) {
      // Kept at once, so a second run of this effect still finds it; a bad
      // token is forgotten again when the check-in fails.
      saveToken(fromLink);
      url.searchParams.delete("token");
      window.history.replaceState(null, "", url.pathname + url.search);
    }
    const token = readToken();
    // Started from a timer that cleanup cancels, so React's development
    // double-run of effects connects once, not twice.
    const start = setTimeout(() => (token ? void connect(token) : setPhase({ kind: "setup", error: null })), 0);
    return () => clearTimeout(start);
  }, [connect]);

  const handleScan = useCallback(
    (raw: string) => {
      const sender = senderRef.current;
      if (!tokenRef.current || !sender) return;
      const keepShowing = () => {
        setShowCurrent(true);
        if (idleTimer.current) clearTimeout(idleTimer.current);
        idleTimer.current = setTimeout(() => setShowCurrent(false), IDLE_AFTER_MS);
      };
      // A card held on the reader, read again: keep its answer on screen, send nothing.
      if (repeatFilter.isRepeat(raw, Date.now())) {
        keepShowing();
        return;
      }
      const id = crypto.randomUUID();
      const scannedAt = new Date().toISOString();
      // Saved first, then sent now or in its turn (Step 58). In its turn means "Saved" at once.
      const sending = sender.add({ id, raw, scannedAt, schoolId: sender.schoolId, tries: 0 });
      const scan: GateScan = {
        id,
        raw,
        scannedAt,
        rosterStudent: findRosterStudent(raw, rosterRef.current?.roster ?? null),
        state: sending === "waiting" ? { kind: "saved" } : { kind: "checking" },
      };
      setScans((current) => [scan, ...current].slice(0, 20));
      keepShowing();
    },
    [repeatFilter],
  );

  // While ready: the reader's keystrokes, a roster check every 5 minutes, a live clock, and the screen kept on.
  const ready = phase.kind === "ready";
  useEffect(() => {
    if (!ready) return;
    const buffer = createScanBuffer(handleScan);
    // Read keys wherever focus is on the page, even on a button someone
    // clicked (skipping those lost every tap after a click, 2026-10-12).
    // Only the reader's Enter is stopped, so it can't also click that button.
    const onKey = (event: KeyboardEvent) => {
      // Typing in a text field (the setup screen's token) is never a card.
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      // `key` is true only for the Enter that finished a card; cancelling
      // that one Enter keeps it from also pressing a focused button.
      if (buffer.key(event.key, event.timeStamp)) event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    const rosterTimer = setInterval(() => tokenRef.current && void loadRoster(tokenRef.current), ROSTER_EVERY_MS);
    // Waiting taps go out when the browser says it's back online, and every
    // 30 seconds anyway: "online" isn't always told (Step 58).
    const sendWaiting = () => senderRef.current?.kick();
    window.addEventListener("online", sendWaiting);
    const retryTimer = setInterval(sendWaiting, RETRY_EVERY_MS);
    const stuckTimer = setInterval(() => void senderRef.current?.retryStuck(), STUCK_EVERY_MS);
    const clockTimer = setInterval(() => setNow(new Date().toISOString()), 15_000);

    let wakeLock: WakeLockSentinel | null = null;
    const keepAwake = () => {
      if (document.visibilityState !== "visible" || !("wakeLock" in navigator)) return;
      navigator.wakeLock.request("screen").then(
        (lock) => (wakeLock = lock),
        () => undefined,
      );
    };
    keepAwake();
    document.addEventListener("visibilitychange", keepAwake);

    return () => {
      window.removeEventListener("keydown", onKey);
      clearInterval(rosterTimer);
      window.removeEventListener("online", sendWaiting);
      clearInterval(retryTimer);
      clearInterval(stuckTimer);
      clearInterval(clockTimer);
      document.removeEventListener("visibilitychange", keepAwake);
      void wakeLock?.release();
    };
  }, [ready, handleScan, loadRoster]);

  async function startNfc() {
    const Reader = ndefReaderClass();
    if (!Reader) return;
    try {
      const reader = new Reader();
      reader.onreading = (event) => handleScan(event.serialNumber);
      await reader.scan();
      setNfcOn(true);
    } catch {
      setNfcOn(false);
    }
  }

  function handleSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get("token") ?? "").trim();
    if (!value) return;
    setPhase({ kind: "starting" });
    void connect(value);
  }

  if (phase.kind === "starting") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background p-6 text-muted-foreground">
        <Loader2 className="size-8 animate-spin" aria-hidden="true" />
        <span className="sr-only">Connecting…</span>
      </main>
    );
  }

  if (phase.kind === "setup") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background p-6">
        <form
          onSubmit={handleSetup}
          className="flex w-full max-w-md flex-col gap-5 rounded-2xl border border-border bg-card p-6"
        >
          <div className="flex flex-col gap-1.5">
            <h1 className="font-heading text-2xl font-semibold text-foreground">Set up this gate</h1>
            <p className="text-muted-foreground">
              Enter the gate token from the office. It starts with <span className="font-mono">tal_dev_</span>.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="gate-token">Gate token</Label>
            <Input
              id="gate-token"
              name="token"
              autoComplete="off"
              spellCheck={false}
              className="h-11 font-mono"
              aria-invalid={phase.error ? true : undefined}
              aria-describedby={phase.error ? "gate-token-error" : undefined}
            />
            {phase.error ? (
              <p id="gate-token-error" className="text-sm text-destructive">
                {phase.error}
              </p>
            ) : null}
          </div>
          <Button type="submit" className="h-11">
            Connect
          </Button>
        </form>
      </main>
    );
  }

  const queueNotices = [
    !serverReached ? "Can't reach the server. Taps are saved on this tablet and sent when it's back." : null,
    queueSummary && queueSummary.waiting > 0
      ? `${taps(queueSummary.waiting)} saved on this tablet, waiting to send.`
      : null,
    queueSummary && queueSummary.stuck > 0
      ? `${taps(queueSummary.stuck)} couldn't be sent. Keep this tablet on and tell the office.`
      : null,
    queueSummary && queueSummary.otherSchool > 0
      ? `${taps(queueSummary.otherSchool)} from another school ${queueSummary.otherSchool === 1 ? "is" : "are"} saved on this tablet.`
      : null,
    queueSummary?.storageFull ? "This tablet's storage is full. Tell the office." : null,
  ].filter((notice) => notice !== null);

  const current = showCurrent ? scans[0] : undefined;
  const display = current ? describeScan(current) : null;
  const studentIdOf = (scan: GateScan) => {
    const response = scan.state.kind === "answered" ? scan.state.response : null;
    return response && "student" in response && response.student
      ? response.student.id
      : (scan.rosterStudent?.id ?? null);
  };
  const photoFor = (scan: GateScan) => {
    const studentId = studentIdOf(scan);
    const photo = roster?.roster.students.find((student) => student.id === studentId)?.photo;
    return photo ? (photoUrls.get(photo) ?? null) : null;
  };

  return (
    // Exactly the screen's height, never scrolled: only the Recent list scrolls, and the photo shrinks (P-051).
    <main className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 sm:px-6">
        <div>
          <h1 className="font-heading text-lg font-semibold">Gate</h1>
          <p className="text-sm text-muted-foreground">Connected as {phase.label}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {nfcSupported && !nfcOn ? (
            <Button type="button" variant="outline" className="h-11" onClick={startNfc}>
              <Nfc className="size-4" aria-hidden="true" />
              Use this tablet&apos;s NFC
            </Button>
          ) : null}
          {confirmDisconnect ? (
            <>
              <span className="text-sm text-foreground">Disconnect? It will need a new token.</span>
              <Button type="button" variant="destructive" className="h-11" onClick={() => void disconnect(null)}>
                Disconnect
              </Button>
              <Button type="button" variant="ghost" className="h-11" onClick={() => setConfirmDisconnect(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button type="button" variant="ghost" className="h-11" onClick={() => setConfirmDisconnect(true)}>
              Disconnect
            </Button>
          )}
        </div>
      </header>

      {/* Shown while another window has the keyboard, so a tap is never lost without a sign (2026-10-12). */}
      {!pageHasKeyboard ? (
        <p role="status" className="bg-status-late-bg px-4 py-3 text-base font-medium text-status-late sm:px-6">
          Taps from the reader can&apos;t reach this page. Click or tap anywhere on it.
        </p>
      ) : null}

      {/* The waiting line (Step 58): taps kept on this tablet until the server has them. */}
      {queueNotices.length > 0 ? (
        <div
          role="status"
          className="flex flex-col gap-1 bg-status-late-bg px-4 py-3 text-base text-status-late sm:px-6"
        >
          {queueNotices.map((notice) => (
            <p key={notice}>{notice}</p>
          ))}
        </div>
      ) : null}

      {clockOffMinutes !== null ? (
        <p role="status" className="bg-status-late-bg px-4 py-2 text-sm text-status-late sm:px-6">
          This tablet&apos;s clock is off by about {Math.abs(clockOffMinutes)} minutes. Please set the correct time.
        </p>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="flex min-h-0 flex-col items-center justify-center gap-6 p-6 text-center short:p-4">
          {current && display ? (
            <TapCard
              key={current.id}
              kind={display.kind}
              name={display.name}
              grade={display.grade}
              stampAt={display.stampAt}
              detail={display.detail}
              portrait={
                <ScanAvatar
                  kind={display.kind}
                  name={display.name}
                  photoSrc={photoFor(current)}
                  className={TAP_CARD_PORTRAIT}
                />
              }
            />
          ) : (
            <div className="flex flex-col items-center gap-4">
              <Nfc className="size-20 text-primary" aria-hidden="true" />
              <p className="font-heading text-4xl font-bold">Tap your card</p>
              <p className="text-lg text-muted-foreground">
                {formatSchoolDate(now)} · {formatSchoolTime(now)}
              </p>
            </div>
          )}
          <p aria-live="polite" className="sr-only">
            {display ? [display.name, display.message].filter(Boolean).join(": ") : ""}
          </p>
        </section>

        <aside
          aria-labelledby="gate-recent"
          className="hidden min-h-0 flex-col gap-3 overflow-y-auto border-l border-border bg-card p-5 md:flex"
        >
          <h2 id="gate-recent" className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Recent
          </h2>
          {scans.length === 0 ? (
            <p className="text-sm text-muted-foreground">No taps yet.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {scans.slice(0, RECENT_COUNT).map((scan) => {
                const item = describeScan(scan);
                return (
                  <TapListItem
                    key={scan.id}
                    kind={item.kind}
                    name={item.name}
                    label={item.short}
                    at={item.at}
                    portrait={
                      <ScanAvatar kind={item.kind} name={item.name} photoSrc={photoFor(scan)} className="w-10" />
                    }
                  />
                );
              })}
            </ul>
          )}
        </aside>
      </div>
    </main>
  );
}

/** The student's photo or initials, or a card symbol when nobody is known for this card. */
function ScanAvatar({
  kind,
  name,
  photoSrc,
  className,
}: {
  kind: TapKind;
  name: string | null;
  photoSrc: string | null;
  className?: string;
}) {
  if (!name) return <NoPhotoPortrait kind={kind} className={className} />;
  const parts = name.split(" ");
  return (
    <StudentAvatar
      student={{ firstName: parts[0], lastName: parts.at(-1) ?? "" }}
      photoSrc={photoSrc}
      className={className}
    />
  );
}
