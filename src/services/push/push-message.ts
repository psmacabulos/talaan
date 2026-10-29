import type { DueDelivery } from "@/data/repositories/push-outbox-repository";
import { notificationKindLabel } from "@/features/parents/notification-format";
import { formatSchoolTime } from "@/lib/school-time";
import type { PushMessage } from "./push-sender";

/**
 * What the parent's phone shows (Step 54): the title "Juan" over "Tapped in
 * at 7:56 AM", or for a link notice (Step 55.2) "A new parent account was
 * linked", with no adult's name. The child's first name only: the lock
 * screen is visible to anyone near the phone, and the text passes through Expo,
 * Google and Apple, and students are minors. The data lets a tap on the
 * push open the feed at that entry. Every kind uses the "attendance"
 * channel: Android drops a push sent to a channel the app hasn't made.
 * The title is the child's name, never "Bantay Aral" (Step 59.6): Android
 * already puts the app's name at the top of every notification. It can't be
 * left out either: Android folds several pushes into lines of "title body",
 * and a missing title showed as "null" (P-061).
 */
export function toPushMessage(delivery: DueDelivery): PushMessage {
  return {
    to: delivery.token,
    title: delivery.childFirstName,
    body: pushBody(delivery),
    data: { notificationId: delivery.notificationId, childId: delivery.studentId },
    sound: "default",
    channelId: "attendance",
    priority: "high",
  };
}

function pushBody({ kind, tappedAt }: DueDelivery): string {
  switch (kind) {
    case "time_in":
    case "time_out":
      return `${capitalize(notificationKindLabel(kind))} at ${formatSchoolTime(tappedAt)}`;
    case "guardian_linked":
      return "A new parent account was linked";
  }
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
