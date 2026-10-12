"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { Loader2, Nfc } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StudentAvatar } from "@/features/students/student-display";
import { formatSchoolDate, formatSchoolTime } from "@/lib/school-time";
import { cn } from "@/lib/utils";
import {
  checkIn,
  forgetGate,
  GateUnauthorizedError,
  readStoredRoster,
  readToken,
  refreshRoster,
  saveToken,
  sendTap,
  syncPhotos,
  type StoredRoster,
} from "./gate-client";
import { describeScan, type GateScan } from "./gate-display";
import { findRosterStudent } from "./roster-match";
import { createScanBuffer } from "./scan-buffer";
import { TAP_CARD_PORTRAIT, TapCard, TapListItem } from "./tap-card";

/** After this long with no new tap, the big panel tidies back to "Tap your card". It never holds up a tap. */
const IDLE_AFTER_MS = 5_000;
const ROSTER_EVERY_MS = 5 * 60_000;
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

/**
 * The gate tablet's screen (Step 47, docs/GATE.md). Signed in by its own
 * device token, never a staff login. Every card read is sent the moment
 * it's read, without waiting for any earlier one; the photo and name show
 * at once from the tablet's own roster while the server decides.
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

  const tokenRef = useRef<string | null>(null);
  const rosterRef = useRef<StoredRoster | null>(null);
  /** The roster whose photos this page has loaded; null until the first load. */
  const photosLoadedFor = useRef<StoredRoster | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const disconnect = useCallback(async (error: string | null) => {
    tokenRef.current = null;
    rosterRef.current = null;
    photosLoadedFor.current = null;
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

  const connect = useCallback(
    async (token: string) => {
      try {
        const { label, serverTime } = await checkIn(token);
        tokenRef.current = token;
        saveToken(token);
        const offBy = Date.now() - Date.parse(serverTime);
        setClockOffMinutes(Math.abs(offBy) > CLOCK_WARNING_MS ? Math.round(offBy / 60_000) : null);
        rosterRef.current = readStoredRoster();
        setRoster(rosterRef.current);
        setPhase({ kind: "ready", label });
        await loadRoster(token);
      } catch (error) {
        if (error instanceof GateUnauthorizedError) {
          await disconnect("That token doesn't work. Ask the office for a new one.");
        } else {
          setPhase({ kind: "setup", error: "Couldn't reach the server. Check the connection and try again." });
        }
      }
    },
    [disconnect, loadRoster],
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
      const token = tokenRef.current;
      if (!token) return;
      const scan: GateScan = {
        id: crypto.randomUUID(),
        raw,
        scannedAt: new Date().toISOString(),
        rosterStudent: findRosterStudent(raw, rosterRef.current?.roster ?? null),
        state: { kind: "checking" },
      };
      setScans((current) => [scan, ...current].slice(0, 20));
      setShowCurrent(true);
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => setShowCurrent(false), IDLE_AFTER_MS);

      const settle = (state: GateScan["state"]) =>
        setScans((current) => current.map((existing) => (existing.id === scan.id ? { ...existing, state } : existing)));
      sendTap(token, { clientTapId: scan.id, cardSerial: raw, clientTappedAt: scan.scannedAt })
        .then((response) => settle({ kind: "answered", response }))
        .catch(async (error) => {
          if (error instanceof GateUnauthorizedError) {
            await disconnect("This gate was disconnected. Ask the office for a new token.");
          } else {
            settle({ kind: "failed" });
          }
        });
    },
    [disconnect],
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
    <main className="flex min-h-dvh flex-col bg-background text-foreground">
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

      {clockOffMinutes !== null ? (
        <p role="status" className="bg-status-late-bg px-4 py-2 text-sm text-status-late sm:px-6">
          This tablet&apos;s clock is off by about {Math.abs(clockOffMinutes)} minutes. Please set the correct time.
        </p>
      ) : null}

      <div className="grid flex-1 md:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="flex flex-col items-center justify-center gap-6 p-6 text-center">
          {current && display ? (
            <TapCard
              key={current.id}
              kind={display.kind}
              name={display.name}
              grade={display.grade}
              stampAt={display.stampAt}
              detail={display.detail}
              portrait={<ScanAvatar name={display.name} photoSrc={photoFor(current)} className={TAP_CARD_PORTRAIT} />}
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
          className="hidden flex-col gap-3 overflow-y-auto border-l border-border bg-card p-5 md:flex"
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
                    portrait={<ScanAvatar name={item.name} photoSrc={photoFor(scan)} className="w-10" />}
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
  name,
  photoSrc,
  className,
}: {
  name: string | null;
  photoSrc: string | null;
  className?: string;
}) {
  if (!name) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "flex aspect-[4/5] w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground",
          className,
        )}
      >
        <Nfc className="size-1/2" />
      </span>
    );
  }
  const parts = name.split(" ");
  return (
    <StudentAvatar
      student={{ firstName: parts[0], lastName: parts.at(-1) ?? "" }}
      photoSrc={photoSrc}
      className={className}
    />
  );
}
