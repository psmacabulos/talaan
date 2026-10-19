# The parent app's starter kit

The Bantay Aral parent app is a separate Expo (React Native) project in its own repository. This folder holds everything that repository needs on its first day, so its Claude can read it and start without anything being explained again. It lives here, next to the API it describes, so the two change together.

`starter/` is copied into the new repository as it is. This README stays here and isn't copied.

## Is the API ready? (checked 2026-10-19)

Yes, for the whole demo (the app's steps M1 to M8):

| The app needs                                       | Talaan has it                                      | Since          |
| --------------------------------------------------- | -------------------------------------------------- | -------------- |
| Sign up, sign in, sign out, a token per phone       | `/api/v1/parents/signup`, `/login`, `/logout`      | Step 53.3      |
| The parent and each child's day                     | `GET /api/v1/parents/me`                           | Step 53.3      |
| The school picker, and linking a child              | `GET /schools`, `POST /children`                   | Step 53.3      |
| A child's taps on a day                             | `GET /children/:id/taps`                           | Step 53.3      |
| The notification feed, read marks, the unread count | `/notifications`, `/:id/read`, `/read-all`         | Step 53.4      |
| The child's photo                                   | `GET /api/v1/photos/<key>` with the parent's token | Step 53.4      |
| Registering the phone for push                      | `POST /push-tokens`                                | Step 53.4      |
| Pushes sent when a child taps                       | the push worker, through Expo's push service       | Steps 54, 54.1 |

What isn't there yet, and doesn't block the demo:

- **Forgot password** (Step 55.5). The app shows no link until then.
- **Deleting your own account** (Step 60). The app stores need it before publishing, not before the demo.
  **It's live:** Heroku (`https://bantayaral.herokuapp.com`) is deployed through Step 54.1 (2026-10-19), so the app develops against the live server over HTTPS from M1. Its push setting stays `PUSH_SENDER=log` until the app's M7, when you switch it to `expo` (`starter/docs/SERVER.md`, "Testing a real push").

## What's in the kit

| File, in the new repository       | What it is                                                                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `CLAUDE.md`                       | The instructions Claude reads in every session: the product, scope, stack, constraints and the owner's working rules                       |
| `docs/PLAN.md`                    | Steps M1 to M8 to the demo, with a checkbox per task and an "Owner review" box per step, then the after-demo list                          |
| `docs/TALAAN-API.md`              | The API contract. **Not in this folder:** it's copied straight from `docs/PARENT-API.md` (below), so there's only one copy to keep current |
| `docs/PRODUCT-RULES.md`           | What the server decides, the words to use, times and dates, the form field rules, privacy                                                  |
| `docs/DESIGN.md`                  | How to use your UI design, the rules that hold whatever the design says, and the web app's tokens as a fallback                            |
| `docs/SERVER.md`                  | Which server to use (Heroku by default, the Mac as a fallback), the demo data, and testing a real push                                     |
| `design/README.md`                | Where your UI design goes                                                                                                                  |
| `reference/mark-shapes.ts`        | The Bantay Aral logo as vector data, with its light and dark colours                                                                       |
| `reference/school-time.ts`        | How times are shown on the school's clock, whatever the phone's time zone                                                                  |
| `.claude/settings.json`           | Blocks every git command that changes anything, and reading or editing `.env` (the same as here)                                           |
| `.claude/agents/app-architect.md` | The review agent for plans and finished changes, with the same reading budget as Talaan's                                                  |
| `.env.example`                    | The one setting the app needs, `EXPO_PUBLIC_API_URL`                                                                                       |

## How to start the new repository

1. **Create the repository** on GitHub, for example `bantayaral-parent-app`, and clone it next to this one (`~/Documents/bantayaral-parent-app`).
2. **Copy the kit and the API contract** (from this repository's folder):

   ```bash
   cp -R mobile/starter/. ../bantayaral-parent-app/
   cp docs/PARENT-API.md ../bantayaral-parent-app/docs/TALAAN-API.md
   ```

   The `/.` copies the hidden `.claude` folder and `.env.example` too.

3. **Put your UI design** in the new repository's `design/` folder (see `design/README.md` there).
4. **Create the app's `.env`** from `.env.example` (it already points at Heroku; `docs/SERVER.md` has the Mac fallback).
5. **Commit** the kit as the first commit, for example `chore: add the project brief and plan`.
6. **Open Claude Code in the new repository** and paste this as the first message:

   ```text
   Read CLAUDE.md, docs/PLAN.md and docs/TALAAN-API.md. This is the Bantay Aral parent app, a new repository with no code yet. My UI design is in design/. Start with step M1: plan first, tell me what you'll create and which packages you want to add with what each costs, and wait for my approval.
   ```

## Keeping it current

When Talaan changes something the app depends on, copy it again:

| What changed in Talaan                                       | Copy again                                                          |
| ------------------------------------------------------------ | ------------------------------------------------------------------- |
| The parent API (`docs/PARENT-API.md`)                        | `cp docs/PARENT-API.md ../bantayaral-parent-app/docs/TALAAN-API.md` |
| A rule, the stack, the design tokens or the plan in this kit | Edit it here first, then copy that one file from `mobile/starter/`  |
| The logo (`src/components/brand/mark-shapes.ts`)             | Update `starter/reference/mark-shapes.ts`, then copy it             |

Requests go the other way too: when the app needs something the API doesn't have, its Claude writes it in the app's `docs/API-REQUESTS.md`. Bring it here, where it becomes a Talaan step.
