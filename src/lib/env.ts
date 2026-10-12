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
