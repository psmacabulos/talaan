# Step 30: Install Docker Desktop and run a local Postgres database

## Why

Everything in Phase 1 reads and writes to `src/data/seed/` — plain TypeScript arrays sitting in memory. Restart the dev server and any change from "Simulate a tap" or the demo login is gone, because there's nowhere for it to persist. Phase 2 replaces that with **PostgreSQL**, a real database that keeps data on disk between restarts, enforces the shape of your data (a `Student` row can't have a missing `schoolId`), and lets multiple things (your dev server, a future tap station, a background job) read and write the same data safely at once.

Postgres itself is just a program that needs to be running somewhere, listening for connections. On a real server it runs directly on the machine (that's what your Heroku Postgres add-on will be, later). On your own laptop, the standard way backend developers run it is inside **Docker** — a tool that runs a program in an isolated, disposable little box (a "container") instead of installing it directly onto Windows.

Why Docker instead of installing Postgres for Windows directly:
- **Disposable.** If you mess up the database, you delete the container and start a fresh one in seconds — no uninstall/reinstall of a real Windows program.
- **Matches production.** Your app will talk to Postgres the exact same way (a connection string) whether that Postgres is in a container on your laptop or a managed instance on Heroku. Nothing about your code changes.
- **Standard practice.** This is genuinely how most backend teams run a local database — not a beginner shortcut.

This step only gets Postgres running and reachable. The next step (31) connects Prisma — the tool your Next.js code will actually use to talk to it — to this database. Today you're just proving the box exists and is open before building anything on top of it.

## What you'll need

- Windows 11 with virtualization enabled (the default on modern PCs — Docker Desktop's installer will tell you if it isn't).
- About 10 minutes and one restart of your PC if Docker asks for one (enabling WSL2, if it isn't already on).

## Steps

### 1. Install Docker Desktop

Download it from **https://www.docker.com/products/docker-desktop/** and run the installer. Keep the default option to use the **WSL 2 backend** when asked. If it asks to restart your computer, do that, then open Docker Desktop from the Start menu and wait for it to say it's running (a whale icon in the system tray).

### 2. Confirm Docker works

Open a terminal (VS Code's built-in terminal is fine) and run:

```bash
docker --version
```

You should see something like `Docker version 27.x.x`. Then run:

```bash
docker run hello-world
```

**Why:** this downloads a tiny test image and runs it once, just to prove Docker can pull images and run containers at all, before you trust it with something real. You should see a message starting with "Hello from Docker!".

### 3. Start a Postgres container for this project

```bash
docker run --name talaan-postgres -e POSTGRES_PASSWORD=devpassword -e POSTGRES_DB=talaan -p 5432:5432 -v talaan-pgdata:/var/lib/postgresql/data -d postgres:16
```

**Why each part:**
- `--name talaan-postgres` — a name you can refer to later (`docker stop talaan-postgres`, etc.) instead of a random id.
- `-e POSTGRES_PASSWORD=devpassword` — sets the password for Postgres's built-in `postgres` user. This is a throwaway local dev password, never used anywhere real — it's fine to see it in plain text here.
- `-e POSTGRES_DB=talaan` — creates an empty database named `talaan` the moment the container starts, instead of you creating it by hand.
- `-p 5432:5432` — "port mapping": Postgres inside the container listens on port 5432; this exposes that same port on your actual machine, so tools on Windows (Prisma, `psql`, a GUI client) can reach `localhost:5432`.
- `-v talaan-pgdata:/var/lib/postgresql/data` — a named Docker "volume": Postgres's actual data files are stored here, on your machine, outside the container. Without this, deleting the container would silently delete every row in it too. With it, you can delete and recreate the container and your data survives.
- `-d` — "detached": run it in the background instead of tying up your terminal.
- `postgres:16` — the official Postgres image, version 16 (a current stable major version).

### 4. Confirm it's running

```bash
docker ps
```

You should see one row, `talaan-postgres`, with a `STATUS` of `Up` and `PORTS` showing `0.0.0.0:5432->5432/tcp`.

### 5. Connect to it and prove the database is really there

```bash
docker exec -it talaan-postgres psql -U postgres -d talaan
```

**Why:** `psql` is Postgres's own command-line client. `docker exec -it` runs a command *inside* the already-running container rather than starting a new one — here, that command is `psql` itself, logging in as the `postgres` user to the `talaan` database. Your prompt should change to `talaan=#`.

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

Then, in VS Code, create a new file named exactly `.env` in the project root (same folder as `.env.example`) with the same `DATABASE_URL` line. `.env` is already in `.gitignore`, so it never gets committed — that's deliberate, since real environments (Heroku, later) will have a different, real password in their own `.env`-equivalent.

**Why a connection string:** `postgresql://postgres:devpassword@localhost:5432/talaan` packs everything a client needs into one string: protocol (`postgresql`), user (`postgres`), password (`devpassword`), host (`localhost`), port (`5432`), and database name (`talaan`). Prisma, in the next step, reads exactly this string from `DATABASE_URL`.

## Verify it worked

- `docker ps` shows `talaan-postgres` as `Up`.
- You connected with `psql` and saw `Did not find any relations.` from `\dt`.
- `.env.example` has the new `DATABASE_URL` line, and your own `.env` (not committed) has the same line with the real local value.

## If something goes wrong

- **"port is already allocated" when starting the container** — something else on your machine is already using port 5432, usually a Postgres install from a previous project. Either stop that other Postgres, or change the mapping to `-p 5433:5432` and use `5433` in your connection string instead.
- **Docker Desktop won't start / complains about WSL2** — open PowerShell as Administrator and run `wsl --update`, then restart Docker Desktop.
- **`docker: command not found` in your terminal** — close and reopen the terminal after installing (it needs to pick up the new PATH), or restart VS Code entirely.
- **`docker exec` says the container is not running** — check `docker ps -a` (note the `-a`, which shows stopped containers too). If it's stopped, `docker start talaan-postgres` restarts the same container without losing data.

## What you just learned

- **Container vs. volume:** the container is the running program (throwaway, easy to delete/recreate); the volume is where its actual data lives (kept, survives the container being deleted).
- **Port mapping:** how a program running inside an isolated box becomes reachable from your normal Windows terminal.
- **Connection string:** the standard way almost every database client — `psql`, Prisma, a GUI tool — is told how to reach a database: one string with the user, password, host, port and database name packed in.

## What's next

Step 31 installs Prisma in the Next.js project and points it at `DATABASE_URL`, so your actual application code can start talking to this database.
