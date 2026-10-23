import { PRODUCT_NAME } from "@/lib/product";

/** What a Server Action answers when the browser is signed out, or the session has expired. */
export const SIGNED_OUT_MESSAGE = "Your session has expired. Sign in again.";

/** One answer for every failed sign-in, staff or parent, so a form never reveals which emails have accounts. */
export const WRONG_SIGN_IN_MESSAGE = "That email or password isn't right.";

/** The wrong-try limit's answer (src/services/auth/login-throttle.ts). */
export const TOO_MANY_TRIES_MESSAGE = "Too many tries. Wait 15 minutes and try again.";

/** A set-password link that has expired, was already used, or was never real (Step 50.5; Step 55.5 points to the email). */
export const LINK_USED_MESSAGE =
  "This link has expired or was already used. Use “Forgot your password?” on the sign-in page to get a new one.";

/**
 * "Forgot your password?" while a live server can't send email yet
 * (`canEmailPeople`), so a reset link comes from a person (Step 50.5).
 */
export const FORGOT_PASSWORD_MESSAGE = `Ask your principal for a password reset link. If you're the principal, ask your ${PRODUCT_NAME} administrator.`;

/** Step 55.5's answer to every "Forgot your password?", whether or not the email has an account. */
export const RESET_SENT_MESSAGE = "If that email belongs to a staff account, we've sent a link to it. It works for 1 hour.";

/** Over 3 requests for one email, or 20 from one network, in an hour. */
export const RESET_TOO_MANY_MESSAGE = "Too many requests. Wait an hour and try again.";

/** The app's 80 emails a day are used up (`dailyEmailCap`). */
export const EMAIL_UNAVAILABLE_MESSAGE =
  "We can't send emails right now. Try again tomorrow, or ask your principal for a reset link.";
