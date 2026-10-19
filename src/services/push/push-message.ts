import type { DueDelivery } from "@/data/repositories/push-outbox-repository";
import { notificationKindLabel } from "@/features/parents/notification-format";
import { PRODUCT_NAME } from "@/lib/product";
import { formatSchoolTime } from "@/lib/school-time";
import type { PushMessage } from "./push-sender";

/**
 * What the parent's phone shows (Step 54): "Juan tapped in at 7:56 AM".
 * The first name only: the lock screen is visible to anyone near the phone,
 * and the text passes through Expo, Google and Apple, and students are
 * minors. The data lets a tap on the push open the feed at that entry.
 */
export function toPushMessage(delivery: DueDelivery): PushMessage {
  return {
    to: delivery.token,
    title: PRODUCT_NAME,
    body: `${delivery.childFirstName} ${notificationKindLabel(delivery.kind)} at ${formatSchoolTime(delivery.tappedAt)}`,
    data: { notificationId: delivery.notificationId, childId: delivery.studentId },
    sound: "default",
    channelId: "attendance",
    priority: "high",
  };
}
