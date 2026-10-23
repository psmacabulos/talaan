const MIN_SESSION_SECRET_LENGTH = 32;

/**
 * The secret that stamps session cookies (src/lib/signed-value.ts). Anyone
 * who knows it could make a cookie for any account, so it lives only in
 * `.env` and the server's settings. Read when a cookie is made or checked,
 * not at start-up, so `npm run build` doesn't need it. Throws instead of
 * signing with an empty or guessable secret.
 */
export function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < MIN_SESSION_SECRET_LENGTH) {
    throw new Error(
      `SESSION_SECRET is missing or shorter than ${MIN_SESSION_SECRET_LENGTH} characters. Make one with \`openssl rand -base64 32\` and add it to .env (see .env.example).`,
    );
  }
  return secret;
}

/**
 * A real server people use: built for production, and not the browser
 * tests' own production server (playwright.config.ts sets E2E=1 for it).
 * src/instrumentation.ts checks the settings only here. A Heroku dyno
 * (`DYNO` is set) is always live, so `E2E` set there by mistake can't skip
 * the check or print emails' links to the log (Step 55.5).
 */
export function isLiveServer(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NODE_ENV === "production" && (env.E2E !== "1" || Boolean(env.DYNO));
}

/**
 * This site's address for links in emails (Step 55.5), from APP_URL, never
 * from the request: anyone can send a request whose headers name another
 * site, and a reset email would then link there. Off a live server it
 * defaults to the development address.
 */
export function appUrl(env: NodeJS.ProcessEnv = process.env): string {
  return (env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
}

/** What EMAIL_SENDER="smtp" needs (src/lib/email/email-sender.ts). */
export const SMTP_SETTINGS = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "EMAIL_FROM", "APP_URL"] as const;

/** What PHOTO_STORAGE="s3" needs (src/lib/storage/photo-storage.ts). */
export const S3_SETTINGS = ["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"] as const;

/**
 * Every setting a live server can't run safely without (Step 52), as a list
 * of problems that name the setting, never its value. Empty when all is
 * well. src/instrumentation.ts stops the server from starting if any are
 * found, so a missing secret shows up in the deploy's logs, not as a
 * half-working site.
 */
export function checkProductionEnv(env: NodeJS.ProcessEnv): string[] {
  const problems: string[] = [];
  const secret = env.SESSION_SECRET;
  if (!secret || secret.length < MIN_SESSION_SECRET_LENGTH) {
    problems.push(`SESSION_SECRET is missing or shorter than ${MIN_SESSION_SECRET_LENGTH} characters.`);
  }
  if (!env.DATABASE_URL) problems.push("DATABASE_URL is missing.");
  if (env.PHOTO_STORAGE !== "s3") {
    problems.push('PHOTO_STORAGE must be "s3": the server\'s own disk is wiped on every restart.');
  } else {
    const missing = S3_SETTINGS.filter((name) => !env[name]);
    if (missing.length > 0) problems.push(`PHOTO_STORAGE="s3" needs ${missing.join(", ")}.`);
  }
  if (env.DEMO_NOW) problems.push("DEMO_NOW is set: a live server must run on the real clock.");
  // Step 54: say on purpose whether pushes really go out.
  if (env.PUSH_SENDER !== "expo" && env.PUSH_SENDER !== "log") {
    problems.push(
      'PUSH_SENDER must be "expo" (send pushes) or "log" (only log them, until the parent app can receive them).',
    );
  } else if (env.PUSH_SENDER === "expo" && !env.EXPO_ACCESS_TOKEN) {
    problems.push('PUSH_SENDER="expo" needs EXPO_ACCESS_TOKEN, so only this server can push to the app\'s phones.');
  }
  // Step 55.5: say on purpose whether emails really go out.
  if (env.EMAIL_SENDER !== "smtp" && env.EMAIL_SENDER !== "log") {
    problems.push('EMAIL_SENDER must be "smtp" (send emails) or "log" (only log them, until email is set up).');
  } else if (env.EMAIL_SENDER === "smtp") {
    const missing = SMTP_SETTINGS.filter((name) => !env[name]);
    if (missing.length > 0) problems.push(`EMAIL_SENDER="smtp" needs ${missing.join(", ")}.`);
    else {
      if (!/^\d+$/.test(env.SMTP_PORT ?? "")) problems.push("SMTP_PORT must be a port number, such as 465.");
      if (!env.APP_URL?.startsWith("https://")) problems.push("APP_URL must start with https://.");
    }
  }
  return problems;
}
