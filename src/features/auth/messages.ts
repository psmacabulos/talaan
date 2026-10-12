/** What a Server Action answers when the browser is signed out, or the session has expired. */
export const SIGNED_OUT_MESSAGE = "Your session has expired. Sign in again.";

/** One answer for every failed sign-in, staff or parent, so a form never reveals which emails have accounts. */
export const WRONG_SIGN_IN_MESSAGE = "That email or password isn't right.";

/** The wrong-try limit's answer (src/services/auth/login-throttle.ts). */
export const TOO_MANY_TRIES_MESSAGE = "Too many tries. Wait 15 minutes and try again.";

/** A set-password link that has expired, was already used, or was never real (Step 50.5). */
export const LINK_USED_MESSAGE = "This link has expired or was already used. Ask your principal for a new one.";
