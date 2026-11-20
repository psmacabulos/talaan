# Step 59.10: After a deploy, the error page asks for a reload

> **Written from the real diff on 2026-11-20.** The owner asked for it to be built straight away, so there was no recipe before the code. From P-062 in `docs/PROBLEMS-LOG.md` (option 2). The full story is in `docs/BUILD-LOG.md`, "Step 59.10".

## Why

A form that saves (sign in, add a student, record a time out) calls a **server action**. The browser asks for it by an ID that each build makes new. With a page open across a deploy, the browser asks the new server for the old ID:

```
browser (page from the old release) ── "run action 4051d7…" ──► server (new release)
                                                                      │ "not found"
                                                                      ▼
                       Next.js throws UnrecognizedActionError ──► error.tsx ──► ErrorPage
```

Before this step, that showed "Something went wrong", a reference code and "Report this problem", and Sentry emailed a new issue. Nothing was broken: reloading the page fixes it. Next.js calls this **version skew** (`node_modules/next/dist/docs/01-app/02-guides/server-actions.md`, "Deployment considerations").

Now:

```
                    ErrorPage
                        │
     unstable_isUnrecognizedActionError(error)?
          │ yes                              │ no
          ▼                                  ▼
  no Sentry report                  report it (as before)
  ErrorScreen kind="updated"        ErrorScreen (as before)
  "Bantay Aral was updated"         "Something went wrong"
  [ Reload page ]                   code · Try again · Report
```

## What it costs

Nothing. No new package, setting or table. One fewer Sentry report per person per deploy.

## The changes

**1. `src/features/errors/error-screen.tsx`: a `kind` prop.**

```tsx
export function ErrorScreen({
  kind = "error",
  reference,
  onRetry,
  onReport,
  showThemeToggle = true,
}: {
  kind?: "error" | "updated";
  reference?: string;
  /** Try again, or for `kind="updated"`, Reload page. */
  onRetry: () => void;
  ...
```

With `updated` true (`kind === "updated"`), the same layout shows:
- the heading `{PRODUCT_NAME}` / "was updated" (from `src/lib/product.ts`, never a hard-coded name);
- "A new version went live while this page was open. Reload the page to carry on. Anything you typed here will need to be entered again.";
- one button, **Reload page**, which calls `onRetry`;
- no reference code, no Report button and no report dialog, even if `onReport` is passed.

**2. `src/features/errors/error-page.tsx`: decides which page.**

```tsx
import { unstable_isUnrecognizedActionError } from "next/navigation";
...
const updated = unstable_isUnrecognizedActionError(error);

useEffect(() => {
  console.error(error);
  if (!updated) reportBrowserError(error, reference);
}, [error, reference, updated]);

if (updated) {
  return <ErrorScreen kind="updated" onRetry={() => window.location.reload()} showThemeToggle={showThemeToggle} />;
}
```

Why `window.location.reload()` and not `retry`: `retry` only draws the same page again, which still holds the old release's action IDs. A full reload fetches the new release's page.

Why not report it: it's expected after every deploy, not a bug, and each report uses up the free plan's 5,000 a month and sends an email.

`unstable_` means Next.js may rename it in a later version. If it does, the import stops compiling and `npm run typecheck` fails, so an upgrade can't drop it quietly.

**3. `src/app/design-system/_components/error-screen-preview.tsx`:** a third button, **After a deploy**, beside "Report succeeds" and "Report fails". The three are one `PreviewState` now, with `aria-pressed` on the active button.

**4. Tests.**
- `src/features/errors/error-screen.test.tsx`: `kind: "updated"` shows "Bantay Aral was updated", no reference code, no Try again, no Report (even with `onReport` passed), and Reload page calls `onRetry`.
- `src/features/errors/error-page.test.tsx` (new): `@/lib/browser-error-reporting` is mocked. An ordinary `Error` is reported and shows Try again; an `UnrecognizedActionError` (imported from `next/dist/client/components/unrecognized-action-error`, the same class Next.js throws) shows Reload page and is never reported.

## Checks

The usual routine (`docs/LEARNING-LOG.md`), then:

```bash
npx vitest run src/features/errors
npm run dev   # then http://localhost:3000/design-system → Error page → "After a deploy", at 360px and 1280px, light and dark
```

`/design-system` is development only (it answers "not found" in production), so the live check is on the sign-in page. It needs **two** deploys: the error page that shows is the code that came with the page already open, so a page opened before 59.10 went live still has the old one.

```
deploy 59.10 ──► open the sign-in page (now carries the new ErrorPage) ──► deploy any next commit ──► sign in in the same tab
```

1. Push 59.10; wait for CI and Heroku to finish.
2. Open `https://bantayaral.com/` (signed out) and leave the tab open.
3. Push the next commit; wait for CI and Heroku to finish.
4. In the same tab, without reloading, sign in. Expect "Bantay Aral was updated"; press Reload page; sign in again.
5. Sentry: no new `UnrecognizedActionError` issue.
