import { releaseCheck } from "@/lib/env";

/**
 * Runs in Heroku's release phase, before the migrations (Step 59, the
 * Procfile's `release:` line). A missing or unsafe setting refuses the
 * release: the old version keeps serving, and this prints which setting,
 * never its value. Checks every time, without asking whether this is the
 * live server, since the release dyno may not say so.
 */
const { exitCode, lines } = releaseCheck(process.env);
for (const line of lines) (exitCode === 0 ? console.log : console.error)(line);
process.exit(exitCode);
