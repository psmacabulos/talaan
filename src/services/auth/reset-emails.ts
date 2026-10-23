import type { EmailMessage } from "@/lib/email/email-sender";
import { PRODUCT_NAME } from "@/lib/product";

type Person = { firstName: string; email: string };

/** "Forgot your password?"'s email (Step 55.5): the set-password link, for 1 hour. */
export function resetLinkEmail(person: Person, link: string): EmailMessage {
  return {
    to: person.email,
    subject: `Reset your ${PRODUCT_NAME} password`,
    text: [
      `Hi ${person.firstName},`,
      "",
      `Someone asked to reset the password for your ${PRODUCT_NAME} account, ${person.email}.`,
      "To choose a new password, open this link within 1 hour:",
      "",
      link,
      "",
      "The link works once. If you didn't ask for it, you can ignore this email. Your password stays the same.",
    ].join("\n"),
  };
}

/** Sent after a reset (not a first password), so someone who didn't do it knows at once. */
export function passwordChangedEmail(person: Person): EmailMessage {
  return {
    to: person.email,
    subject: `Your ${PRODUCT_NAME} password was changed`,
    text: [
      `Hi ${person.firstName},`,
      "",
      `The password for your ${PRODUCT_NAME} account, ${person.email}, was just changed.`,
      "If you didn't do this, choose a new one straight away with “Forgot your password?” on the sign-in page.",
    ].join("\n"),
  };
}
