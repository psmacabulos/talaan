# Step 59.11: A build with no warnings

> **Written from the real diff on 2026-11-20.** The owner asked for it straight away. From P-058 in `docs/PROBLEMS-LOG.md` (option 3). The full story is in `docs/BUILD-LOG.md`, "Step 59.11".

## Why

Every `npm run build` ended with:

```
Turbopack build encountered 1 warning:
./src/lib/storage/local-photo-storage.ts:20:12
Warning: Dynamic filesystem access causes tracing of the whole project
> 20 |     return path.join(root, ...key.split("/"));
```

`createLocalPhotoStorage` is development's stand-in for R2: photos are files under `.data/photos/<key>`. The path is built from the key while the app runs, so the build can't tell which files it might read, and marks the whole project as needed by the server ("tracing").

```
next build ──► sees path.join(root, ...key) ──► "could be any file" ──► traces the whole project ──► warning
next build ──► sees path.join(/*turbopackIgnore: true*/ root, ...) ──► skips it ──► no warning
```

It never made anything bigger or slower here: tracing is only used by hosts that copy just the traced files (Vercel, or `output: "standalone"`). Heroku runs `npm start` on the whole app (`Procfile`), and `next.config.ts` sets no `output`. But a warning that's always there hides a new one that matters.

## What it costs

Nothing. No package, setting or table. Nothing changes when the app runs: the comment is only read by the build.

## The change

**`src/lib/storage/local-photo-storage.ts`**, inside `createLocalPhotoStorage`:

```ts
const fileFor = (key: string) => {
  assertSafeKey(key);
  // A path made at run time makes the build trace the whole project
  // (P-058). Only development and tests store photos here, so skip it.
  return path.join(/*turbopackIgnore: true*/ root, ...key.split("/"));
};
```

The comment is the fix the warning itself offers ("opt out by adding an ignore comment to the highlighted call"). `turbopackIgnore` is listed in `node_modules/next/dist/docs/01-app/03-api-reference/08-turbopack.md` as Turbopack-only.

**Options not taken** (P-058): a fixed folder in the path (the root is a parameter, so tests can pass their own folder), or leaving it.

## Checks

The usual routine (`docs/LEARNING-LOG.md`), then:

```bash
npx vitest run src/lib/storage
npm run build    # expect no "Turbopack build encountered" warning
```

Then, with `npm run dev` and `PHOTO_STORAGE` unset (local files), add or change a student's photo and see it show: the local storage still works.
