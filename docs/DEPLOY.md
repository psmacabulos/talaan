# Deploying: the live server on Heroku

How Bantay Aral runs on the internet (Step 52): what happens between a push to GitHub and the site changing, every setting the server needs, and the commands for looking after it. The app's Heroku name is `bantayaral` in the examples below; swap in the real one if it differs.

## How a deploy works

**Setting it up the first time** (accounts, the app, the database, R2, the settings, connecting GitHub, the first deploy by hand): `docs/backend/step-52-deploy-heroku.md`, "Your part", Stages A–H.

Heroku gets the code from **GitHub**, not from your laptop. It's connected to the `talaan` repository with automatic deploys from `main`, waiting for CI. Nobody runs `git push heroku`.

```mermaid
flowchart LR
    GH["GitHub main<br/>(you push)"] -->|CI passes| H["Heroku build<br/>npm ci, prisma generate, next build"]
    H --> R["release phase<br/>settings check, then prisma migrate deploy"]
    R --> Web["web dyno<br/>next start, then the settings check"]
    Web --> PG[("Heroku Postgres<br/>Essential-0, version 18")]
    Web --> R2[("Cloudflare R2<br/>talaan-photos (private)")]
    Tablet["Gate tablet"] --> Web
    TV["Guardhouse TV"] --> Web
    Staff["Principal's browser"] --> Web
```

1. **You push to `main`.** GitHub runs CI (`.github/workflows/ci.yml`). Heroku is set to deploy automatically from `main`, but only after CI passes, so a red build never reaches a school.
2. **Build.** Heroku reads `"engines": { "node": "24.x" }` in `package.json` and installs the same Node as CI and your laptop. Then `npm ci`, whose `postinstall` runs `prisma generate`, then `npm run build`. Afterwards Heroku deletes the development packages, which is why `prisma`, `tsx` and `dotenv` are regular `dependencies`: the release phase and the `heroku run` scripts need them.
3. **Release.** The `Procfile`'s `release:` line first checks the settings (`scripts/check-settings.ts`, Step 59), then runs `npx prisma migrate deploy` once, before the new version takes any traffic. If either fails, Heroku keeps the old version running: a missing setting is refused here, with its name in the release log (`heroku releases:output --app bantayaral`), instead of a live site answering 500 (P-026, P-041). Heroku also runs the release phase on `heroku config:set`, so removing a required setting is refused the same way; set related settings in one command. A migration is never rolled back by Heroku; see `docs/DATABASE-MIGRATIONS.md`.
4. **Start.** The `web:` line runs `npm start` (`next start`), which listens on the `PORT` Heroku gives it. Before answering any request, `src/instrumentation.ts` runs `checkProductionEnv` (`src/lib/env.ts`). A missing or dangerous setting stops the start, and the logs list each problem by the setting's name, never its value:

   ```
   The server can't start with these settings:
   - SESSION_SECRET is missing or shorter than 32 characters.
   - PHOTO_STORAGE must be "s3": the server's own disk is wiped on every restart.
   ```

```ts
// src/instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { checkProductionEnv, isLiveServer } = await import("@/lib/env");
  if (isLiveServer()) {
    const problems = checkProductionEnv(process.env);
    if (problems.length > 0) {
      throw new Error(`The server can't start with these settings:\n- ${problems.join("\n- ")}`);
    }
  }
  // … then it starts the push worker (Step 54)
}
```

The browser tests also run a production server, deliberately with test settings (a pinned clock and photos in a local folder). `playwright.config.ts` sets `E2E=1` for that server only, which skips the check. **Never set `E2E` on Heroku.** Since Step 55.5 it would be ignored there anyway: `isLiveServer()` (`src/lib/env.ts`) treats any Heroku dyno (`DYNO` is set) as live. The same applies to trying a production build on your laptop (`npm run build && npm start`): it needs `E2E=1` in front, or the real settings.

## One dyno only

**Keep exactly one `web` dyno.** The live monitor's feed (Step 48) and the sign-in throttle (Step 50) both live in the server's memory. With two dynos, a tap recorded by one wouldn't reach a monitor connected to the other, and the throttle would count each dyno separately. `docs/SCALING.md` covers what changes before a second dyno. Check with `heroku ps --app bantayaral`.

**Heroku's router must be the last hop.** The parent sign-in limits (Step 53.3) count wrong passwords and sign-ups per address, taken from the **last** entry of `X-Forwarded-For`, the one Heroku's router adds (`src/lib/client-address.ts`). That's only true while nothing else proxies in front:
- **Keep `bantayaral.com`'s DNS "DNS only" (grey cloud) at Cloudflare.** With the orange cloud (Cloudflare's proxy), every parent would arrive from Cloudflare's addresses and share one count.
- **A proxy on the same machine** (nginx, Docker, anything that connects from `127.0.0.1`) would switch the address limits off entirely, since loopback is never limited.

The monitor's stream sends a keep-alive every 25 seconds. Heroku's router closes a connection that's silent for 55 seconds, so the monitor stays connected.

## Settings (config vars)

Set with `heroku config:set NAME=value --app bantayaral`. Type secrets yourself; never paste them into a chat or a file in this repository. `heroku config --app bantayaral` lists them.

| Name | Set by | What it's for |
|---|---|---|
| `DATABASE_URL` | Heroku, with the Postgres add-on | The database's address. Heroku can change it during maintenance, so never copy it anywhere. |
| `PGSSLMODE` | you: `no-verify` | Heroku Postgres only accepts encrypted connections, but Node can't verify its certificate. This keeps the encryption without the check (Heroku's own advice for Node). |
| `SESSION_SECRET` | you: `$(openssl rand -base64 32)` | Signs every sign-in cookie and set-password link. Changing it signs everyone out and voids open links. |
| `PHOTO_STORAGE` | you: `s3` | Photos go to R2. The dyno's disk is wiped on every restart and deploy. |
| `PUSH_SENDER` | you: `log` now, `expo` at the deploy after the parent app's M7 | Step 54. `log` makes the pushes and only logs how many would go. Without it the server refuses to start, so **set it before pushing Step 54**: `heroku config:set PUSH_SENDER=log --app bantayaral`. |
| `EXPO_ACCESS_TOKEN` | you: expo.dev, your account, Access tokens | Only with `PUSH_SENDER=expo`, which requires it: only this server can push to the app's phones. |
| `EMAIL_SENDER` | you: `log` now, `smtp` once Resend has verified the domain | Step 55.5 (`docs/EMAIL.md`). `log` writes only each email's subject to the log, and the sign-in page keeps "Ask your principal". Without it the server refuses to start, so **set it before pushing Step 55.5**: `heroku config:set EMAIL_SENDER=log --app bantayaral`. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` | you: `smtp.resend.com`, `465`, `resend` | Only with `EMAIL_SENDER=smtp`, which requires them. |
| `SMTP_PASSWORD` | you: a Resend API key, Sending access, `mail.bantayaral.com` only | The same. |
| `EMAIL_FROM` | you: `Bantay Aral <no-reply@mail.bantayaral.com>` | The same. The address must be on the domain Resend verified. |
| `APP_URL` | you: `https://bantayaral.herokuapp.com` | The same. Links in emails use it, never the request's own address. Must start with `https://`. |
| `NEXT_PUBLIC_SENTRY_DSN` | you: Sentry, the project's Client Keys | Step 59 (`docs/ERROR-TRACKING.md`). Optional: unset, no error reports are sent. Not a secret. The build copies it into the code, so **set it before a deploy**, and deploy again after changing it. |
| `S3_ENDPOINT` | you | `https://<account-id>.r2.cloudflarestorage.com` |
| `S3_BUCKET` | you: `talaan-photos` | The private bucket. |
| `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | you | An R2 API token with Object Read & Write on `talaan-photos` only. |

Never set on Heroku: `DEMO_NOW` (the server refuses to start) and `E2E` (meant only for the browser tests; ignored on a dyno since Step 55.5).

## What it costs

| Piece | Plan | Per month |
|---|---|---|
| Web server | Heroku Basic dyno (never sleeps) | $7 |
| Database | Heroku Postgres Essential-0 (1 GB, 20 connections) | $5 |
| Photos | Cloudflare R2 free tier (10 GB; 500 thumbnails are about 8 MB) | $0 |
| Push notifications | Expo's push service (free); the worker runs inside the web dyno (`docs/PUSH.md`) | $0 |
| Email | Resend's free plan (3,000 a month, 100 a day; the app stops at 80 a day), `docs/EMAIL.md` | $0 |
| **Total** | | **$12**, covered by the Heroku for GitHub Students credit ($13 a month) |

The credit shows on Heroku's Account → Billing page. Until it does, the card on the account is charged.

## Quick recipes

**Deploy.** Push to `main`. Watch it with `heroku logs --tail --app bantayaral`: expect `prisma migrate deploy` in the release phase, then "Ready". Then open `https://bantayaral.herokuapp.com/api/v1/health`, which answers `{"ok":true,"database":"ok"}`, or a `503` with `"database":"unreachable"`.

**Roll back.** `heroku releases --app bantayaral` lists the versions, then `heroku rollback v<N> --app bantayaral`. This rolls back the code only, not the database.

**Load the demo data (first deploy only).** `heroku run npx prisma db seed --app bantayaral`. The demo staff all use the well-known password `Talaan123!`, so before showing the site to anyone, sign in as your own super admin and give any demo account you use a new password with a reset link. `npm run db:reset` refuses to run anywhere but your laptop, by design.

**Your own super admin.**
```bash
heroku run --app bantayaral "npm run staff:link -- --create-super-admin --email <you> --first-name <first> --last-name <last>"
```
Open `https://bantayaral.herokuapp.com` followed by the printed path and set your password.

**A sign-in or reset link for someone.** `heroku run --app bantayaral "npm run staff:link -- --email <email>"`.

**A gate tablet or a monitor.**
```bash
heroku run --app bantayaral "npm run device:create -- --school school-balanga --kind gate --label 'Main gate tablet'"
heroku run --app bantayaral "npm run device:create -- --school school-balanga --kind monitor --label 'Guardhouse TV'"
```
Keep the double quotes around the whole `npm run …` part, with `--app` before it. Typed without them, the Heroku CLI sends a broken command to the server (`run: command not found`, see P-011 in `docs/PROBLEMS-LOG.md`).

Each prints its token once. On the tablet, open `/gate` and enter the token on its setup screen. On the monitor, open `/gate/display/connect?key=<token>`.

**Look inside the database.** `heroku pg:psql --app bantayaral`. `\q` quits.

**Back up now.** `heroku pg:backups:capture --app bantayaral`. `heroku pg:backups --app bantayaral` lists the backups, including Heroku's automatic ones.

**Change a setting.** `heroku config:set NAME=value --app bantayaral`. Heroku restarts the dyno by itself, and the settings check runs again.
