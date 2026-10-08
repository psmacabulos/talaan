# Step 30: Install Docker Desktop and run a local Postgres database

## Why

Everything in Phase 1 reads and writes to `src/data/seed/` — plain TypeScript arrays sitting in memory. Restart the dev server and any change from "Simulate a tap" or the demo login is gone, because there's nowhere for it to persist. Phase 2 replaces that with **PostgreSQL**, a real database that keeps data on disk between restarts, enforces the shape of your data (a `Student` row can't have a missing `schoolId`), and lets multiple things (your dev server, a future tap station, a background job) read and write the same data safely at once.

Postgres itself is just a program that needs to be running somewhere, listening for connections. On a real server it runs directly on the machine (that's what your Heroku Postgres add-on will be, later). On your own laptop, the standard way backend developers run it is inside **Docker** — a tool that runs a program in an isolated, disposable little box (a "container") instead of installing it directly onto your Mac.

Why Docker instead of installing Postgres on the Mac directly (Homebrew or Postgres.app):
- **Disposable.** If you mess up the database, you delete the container and start a fresh one in seconds — nothing to uninstall, no leftover files scattered around macOS.
- **Matches production.** Your app will talk to Postgres the exact same way (a connection string) whether that Postgres is in a container on your laptop or a managed instance on Heroku. Nothing about your code changes.
- **Standard practice.** This is genuinely how most backend teams run a local database — not a beginner shortcut.

This step only gets Postgres running and reachable. The next step (31) connects Prisma — the tool your Next.js code will actually use to talk to it — to this database. Today you're just proving the box exists and is open before building anything on top of it.

```mermaid
flowchart LR
    subgraph Mac["Your Mac"]
        Terminal["Terminal / VS Code<br/>(later: Prisma, Next.js)"]
        subgraph Docker["Docker Desktop"]
            Container["talaan-postgres container<br/>Postgres listening on 5432"]
        end
        Volume[("talaan-pgdata volume<br/>the actual data files")]
    end
    Terminal -- "localhost:5432" --> Container
    Container -- "reads/writes" --> Volume
```

## What you'll need

- A Mac on a recent macOS version (Docker Desktop supports the current macOS release and the two before it).
- To know which chip your Mac has. Run this in a terminal:

  ```bash
  uname -m
  ```

  `arm64` means **Apple silicon** (M1, M2, M3, M4…). `x86_64` means **Intel**. You'll pick the matching download in step 1.
- About 10 minutes. No restart needed on a Mac.

## Steps

### 1. Install Docker Desktop

Go to **https://www.docker.com/products/docker-desktop/** and choose **Download for Mac**, picking **Apple Silicon** or **Intel** to match what `uname -m` told you.

1. Open the downloaded `Docker.dmg` and drag the Docker icon into **Applications**.
2. Open **Docker** from Applications (or Spotlight: ⌘ Space, type "Docker").
3. Accept the terms. If it asks for your Mac password, that's to set up its helper tools. Keep the **recommended settings** when offered.
4. You can skip signing in to a Docker account. It isn't needed for this project.
5. Wait until the **whale icon in the menu bar** (top-right of the screen) stops animating. Docker is now running.

**Why the chip matters:** Docker runs Linux programs inside a small virtual machine. The Apple silicon build runs that virtual machine natively on your chip. The Intel build on an Apple silicon Mac would be slow, or wouldn't run at all.

(If you already use Homebrew, `brew install --cask docker-desktop` installs the same app. Either way works. Still open it once from Applications afterwards.)

### 2. Confirm Docker works

Open a terminal (VS Code's built-in terminal is fine: **View → Terminal**) and run:

```bash
docker --version
```

You should see something like `Docker version 28.x.x, build …`. The exact number doesn't matter. Then run:

```bash
docker run hello-world
```

**Why:** this downloads a tiny test image and runs it once, just to prove Docker can pull images and run containers at all, before you trust it with something real. You should see a message starting with "Hello from Docker!".

### 3. Start a Postgres container for this project

```bash
docker run --name talaan-postgres \
  -e POSTGRES_PASSWORD=devpassword \
  -e POSTGRES_DB=talaan \
  -p 5432:5432 \
  -v talaan-pgdata:/var/lib/postgresql \
  -d postgres:18
```

The `\` at the end of each line means "this command continues on the next line." It's one command split up so you can read it. Paste all six lines together. (You could also type it as one long line without the `\`s; it does exactly the same thing.)

**Why each part:**
- `--name talaan-postgres` — a name you can refer to later (`docker stop talaan-postgres`, etc.) instead of a random id.
- `-e POSTGRES_PASSWORD=devpassword` — sets the password for Postgres's built-in `postgres` user. This is a throwaway local dev password, never used anywhere real — it's fine to see it in plain text here.
- `-e POSTGRES_DB=talaan` — creates an empty database named `talaan` the moment the container starts, instead of you creating it by hand.
- `-p 5432:5432` — "port mapping": Postgres inside the container listens on port 5432. This exposes that same port on your Mac, so tools running on the Mac (Prisma, `psql`, a GUI client) can reach `localhost:5432`.
- `-v talaan-pgdata:/var/lib/postgresql` — a named Docker "volume": Postgres's actual data files are stored here, on your machine, outside the container. Without this, deleting the container would silently delete every row in it too. With it, you can delete and recreate the container and your data survives.
- `-d` — "detached": run it in the background instead of tying up your terminal.
- `postgres:18` — the official Postgres image, version 18. That's the newest version Heroku Postgres supports (16 to 18), so your laptop and production run the same major version. The same image works on Apple silicon and Intel; Docker picks the right one for your chip automatically.

**Watch out for old tutorials:** most guides online were written for Postgres 17 or older and mount the volume at `/var/lib/postgresql/data`. Postgres 18's image changed this: it keeps its data in `/var/lib/postgresql/18/docker`, so the volume has to be mounted one level up, at `/var/lib/postgresql`. If you used the old path with 18, the container would still start, but your data would sit *outside* your named volume. Deleting the container would then delete the data too, with no warning. The path above is the one from the image's own Dockerfile.

The first run downloads the image (a few hundred MB), so give it a minute. It prints one long id when it's done.

### 4. Confirm it's running

```bash
docker ps
```

You should see one row, `talaan-postgres`, with a `STATUS` of `Up …` and `PORTS` showing `0.0.0.0:5432->5432/tcp`. You'll also see it in the Docker Desktop window under **Containers**.

### 5. Connect to it and prove the database is really there

```bash
docker exec -it talaan-postgres psql -U postgres -d talaan
```

**Why:** `psql` is Postgres's own command-line client. You don't need to install it on your Mac, because it already lives inside the container. `docker exec -it` runs a command *inside* the already-running container rather than starting a new one — here, that command is `psql` itself, logging in as the `postgres` user to the `talaan` database. Your prompt should change to `talaan=#`.

At that prompt, type:

```sql
\dt
```

**Why:** `\dt` lists tables. You should see `Did not find any relations.` — that's correct, it means an empty-but-real database exists and you're really connected to it. There's nothing in it yet because Step 31 hasn't defined any tables.

Type `\q` and press Enter to exit back to your normal terminal.

### 6. Record the connection string

In `.env.example`, add this line (with a short comment above it), so the shape of the variable is checked into git for anyone setting up the project:

```bash
# Local Postgres started via Docker — see docs/backend/step-30-local-postgres-docker.md
DATABASE_URL="postgresql://postgres:devpassword@localhost:5432/talaan"
```

Then create your own `.env` in the project root (same folder as `.env.example`) with the same `DATABASE_URL` line. In VS Code: right-click the empty space in the Explorer sidebar → **New File…** → type `.env`. `.env` is already in `.gitignore`, so it never gets committed — that's deliberate, since real environments (Heroku, later) will have a different, real password in their own `.env`-equivalent.

**Heads-up for Finder:** macOS hides files whose name starts with a dot, so `.env` and `.env.example` won't show in Finder by default. Press **⌘ Shift .** in a Finder window to show or hide them. VS Code always shows them.

**Why a connection string:** `postgresql://postgres:devpassword@localhost:5432/talaan` packs everything a client needs into one string: protocol (`postgresql`), user (`postgres`), password (`devpassword`), host (`localhost`), port (`5432`), and database name (`talaan`). Prisma, in the next step, reads exactly this string from `DATABASE_URL`.

## Verify it worked

- `docker ps` shows `talaan-postgres` as `Up`.
- You connected with `psql` and saw `Did not find any relations.` from `\dt`.
- `.env.example` has the new `DATABASE_URL` line, and your own `.env` (not committed) has the same line with the real local value.
- `git status` lists `.env.example` as modified but does **not** list `.env`. That proves `.gitignore` is protecting it.

Then tell me what you saw (or paste the exact error).

## If something goes wrong

- **`Cannot connect to the Docker daemon` / `Is the docker daemon running?`** — Docker Desktop isn't open. Open it from Applications and wait for the menu bar whale to stop animating, then retry. Docker Desktop doesn't always start by itself after you restart your Mac. To make it start automatically: Docker Desktop → **Settings → General → Start Docker Desktop when you sign in to your computer**.
- **`docker: command not found`** — close and reopen the terminal (or restart VS Code) so it picks up the new command. If it still isn't found, open Docker Desktop → **Settings → Advanced** and make sure the CLI tools are installed (the default "System" option), then reopen the terminal.
- **`port is already allocated` / `address already in use` when starting the container** — something else on your Mac already uses port 5432. Usually that's a Postgres installed earlier through Homebrew or Postgres.app. Find out what it is with:

  ```bash
  lsof -i :5432
  ```

  If it's a Homebrew Postgres, stop it with `brew services stop postgresql` (or `postgresql@16`, whichever version `brew services list` shows). If it's Postgres.app, quit it from its menu bar icon. Or leave it running and use another port: change the mapping to `-p 5433:5432` and use `5433` in your connection string instead. If the failed attempt left a stopped container behind, remove it first with `docker rm talaan-postgres`, then rerun step 3.
- **`The container name "/talaan-postgres" is already in use`** — you already created it once (maybe in an earlier attempt). `docker start talaan-postgres` starts that existing one. Only if you want to start over: `docker rm -f talaan-postgres`, then rerun step 3. Your data in the `talaan-pgdata` volume is kept either way.
- **The container stops right after starting, and `docker logs talaan-postgres` says `Error: in 18+, these Docker images are configured to store database data in a format which is compatible with "pg_ctlcluster"` … `there appears to be PostgreSQL data in: …`** — the `talaan-pgdata` volume already holds data from an older Postgres version (for example, an earlier try with `postgres:16`). At this step the database is still empty, so it's safe to throw that volume away and start fresh:

  ```bash
  docker rm -f talaan-postgres
  docker volume rm talaan-pgdata
  ```

  Then rerun step 3. (Later, once the database holds real data, you'd never delete the volume to change versions. You'd do a proper upgrade instead. That's a problem for another day.)
- **`docker exec` says the container is not running** — check `docker ps -a` (the `-a` also shows stopped containers). If it's stopped, `docker start talaan-postgres` restarts the same container without losing data. Stopped containers are normal after a Mac restart.
- **Docker Desktop is using a lot of memory or battery** — that's its Linux virtual machine. Quitting Docker Desktop from the menu bar whale stops everything, and your data stays safe in the volume. Open it again and run `docker start talaan-postgres` when you're back to backend work.

## What you just learned

- **Container vs. volume:** the container is the running program (throwaway, easy to delete/recreate); the volume is where its actual data lives (kept, survives the container being deleted).
- **Port mapping:** how a program running inside an isolated box becomes reachable from your normal Mac terminal at `localhost`.
- **Connection string:** the standard way almost every database client — `psql`, Prisma, a GUI tool — is told how to reach a database: one string with the user, password, host, port and database name packed in.

## Everyday commands from now on

| You want to… | Run |
|---|---|
| Start the database (after a restart) | `docker start talaan-postgres` |
| Stop it | `docker stop talaan-postgres` |
| See if it's running | `docker ps` |
| Open a `psql` prompt | `docker exec -it talaan-postgres psql -U postgres -d talaan` |

## What's next

Step 31 installs Prisma in the Next.js project and points it at `DATABASE_URL`, so your actual application code can start talking to this database.
