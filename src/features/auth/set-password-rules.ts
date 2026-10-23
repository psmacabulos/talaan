/** A set-password link works for 7 days (owner decision, 2026-10-11). Here, not in the service, so the browser can show it too. */
export const SET_PASSWORD_LINK_DAYS = 7;

/** A set-password link sent by "Forgot your password?" works for 1 hour (Step 55.5): it travels by email, not from a principal. */
export const RESET_EMAIL_LINK_SECONDS = 60 * 60;
