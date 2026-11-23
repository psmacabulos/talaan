# Step 59.14: Disable and enable a device

> **Written from the real diff on 2026-11-23.** The owner asked for the step and for a systems-architect review first (one round). The architect found that a plan to answer a disabled device with 401 would make Enable useless for a gate; the owner chose option A below. The full story is in `docs/BUILD-LOG.md`, "Step 59.14"; how it works is in `docs/GATE.md`, "Disabling a device".

## Why

A school needs to switch a device off (a lost tablet, a leaked monitor link, P-068) and back on. The database already had a `status` (`active` or `revoked`; the page says Enabled and Disabled), and every device route already refused a revoked key. The new work is the menu, the status change, and making a gate and a monitor behave sensibly when switched off and on.

## The dead end, caught before coding

The plan was "disabled = the same 401 an unknown key gets". The architect checked the tablet's code: on any 401 it calls `forgetGate()`, which removes the key, the roster and the photos. The key is stored only as a hash and shown once, so it can't be reissued. A disabled gate would wipe its own key at its next request, and pressing Enable afterwards would flip a row nobody could use.

```
401 (unknown key)  ──► tablet forgets its key ──► setup screen      (right: the key is no good)
403 + device_disabled ─► tablet WAITS, keeps key ──► carries on once enabled   (option A, built)
```

The other option (B) was to make a gate's Disable permanent and say so; the owner chose A.

## The changes

**1. `src/features/devices/disabled.ts` (new):** the code and message the server and tablet share.

```ts
export const DEVICE_DISABLED_CODE = "device_disabled";
export const DEVICE_DISABLED_MESSAGE = "This device is disabled. Ask the office to enable it.";
```

**2. `src/services/devices/authenticate-device.ts`:** `findDeviceByToken` returns the device whatever its status; `authenticateDevice` is now that plus an `active` check, so every other route behaves as before.

**3. `src/services/devices/authenticate-gate.ts`:** a disabled device's real key gets `{ ok: false, status: 403, code: "device_disabled" }` (a missing or unknown key is still 401, a monitor's key on a gate route still a plain 403). `gateAuthResponse(auth)` builds the response, and the roster and taps routes use it. `src/app/api/v1/devices/heartbeat/route.ts` answers the same way.

**4. Repository:** two methods on `DeviceRepository`.

```ts
async setStatus(schoolId, id, status) {
  const { count } = await db.device.updateMany({ where: { id, schoolId }, data: { status } });
  return count > 0;                     // false: not there, or another school's
},
async findStatus(id) {
  const row = await db.device.findUnique({ where: { id }, select: { status: true } });
  return row?.status ?? null;
},
```

`setStatus` writes only `status`, so it can't undo a `lastSeenAt` write and the other way round.

**5. `src/services/devices/set-device-status.ts` (new), and `disableDevice` / `enableDevice` in `src/features/devices/actions.ts`:** the same guards as Add (signed in; not a teacher; a school open), the school always from the session, "That device wasn't found" for anything else, `refresh()`, and one log line (`device <id> disabled by principal`), no names.

**6. The monitor's feed, `src/app/api/v1/gate/stream/route.ts`:** the 5-minute timer that already marks the monitor seen also asks `isDeviceStillActive(deviceId)` (`src/services/devices/still-active.ts`, one read by primary key; an error counts as enabled) and ends the feed through the same `end()` the browser's abort uses, so no timer or subscription is left behind. `gate-monitor.tsx` reloads the page when `EventSource` gives up (`readyState === CLOSED`), and the "isn't connected" page (`src/app/gate/display/page.tsx`) carries `RefreshEvery` (`refresh-every.tsx`), so an enabled monitor carries on by itself.

**7. The tablet:**
- `gate-client.ts`: `GateDisabledError`, and `refusedBy403(response)` reading the code. At check-in only a coded 403 counts; any other 403 there (a web filter's) is "can't reach" as before.
- `tap-sender.ts`: a new `onDisabled` callback; a disabled answer stops the line, keeps every tap and calls `onUnsent` for the one on its way.
- `gate-kiosk.tsx`: `pause()` stops the sender and timers and shows the "This gate is disabled" screen, forgetting nothing. Once a minute it checks in; success calls `connect(token)` again. A tablet with no saved identity calls `disconnect` with a message instead.

**8. The menu, `src/features/devices/device-row-menu.tsx` (new):** modeled on `staff-row-menu.tsx`. Enabled device: **Disable device** (destructive item) opens a dialog worded for the kind of device, with a warning when it is the school's only enabled gate. Disabled device: **Enable device**, immediate. `devices-list.tsx` works out which gate is the only enabled one; `device-table.tsx` adds the Actions column and `device-cards.tsx` the button beside the badge.

## Tests

- Unit: `authenticate-gate.test.ts` (403 with the code, 401 without), `authenticate-device.test.ts`, `set-device-status.test.ts`, `still-active.test.ts`, `actions.test.ts`, `gate-client.test.ts`, `tap-sender.test.ts`, `device-row-menu.test.tsx`, `gate-monitor.test.tsx`, `refresh-every.test.tsx`, and route tests for the roster, taps, heartbeat and stream.
- Postgres: `prisma-device-repository.pg.test.ts` (another school's device untouched; only `status` written).
- Browser: `e2e/devices.spec.ts`, "Disabling a device": add a gate, sign it in, disable it, check 403 with the code and a plain 401 for an unknown key, reload the tablet and see it wait (no setup form), enable it, and the same key works.

## Left for later

- No audit trail (who disabled what, when): there is no audit table in the repo. The log line is the minimum.
- A disabled monitor keeps showing taps for up to 5 minutes. A faster path (an in-process signal) breaks with a second dyno, so the timer stays the backstop.

## Checks

```bash
npm run lint && npm run check:tokens && npm run typecheck && npm test && npm run build
npx vitest run src/data/repositories/prisma-device-repository.pg.test.ts
npx playwright test e2e/devices.spec.ts
npm run dev   # Devices → ⋮ → Disable device / Enable device, at 360px and 1280px, light and dark
```

By hand: add a gate, open `/gate?token=<key>`, disable it from Devices, reload the gate (it says "This gate is disabled"), enable it, reload (it connects with no setup). Remove test devices afterwards, or leave them disabled; a disabled device still holds its name.
