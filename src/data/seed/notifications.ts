import type { Notification } from "@/features/parents/types";

/**
 * A couple of sample notifications, aligned to the seed taps in taps.ts
 * (student-0001 tapped in at 07:56, student-0002 at 07:57) so the data reads
 * as a real morning rather than made-up timestamps. Kept small — the real
 * notification feed (Step 24) is populated by the simulated-tap mechanism,
 * not from here — but present so `seed.test.ts` exercises
 * `notificationSchema` against real data the way it does every other seed
 * collection.
 */
export const seedNotifications: Notification[] = [
  {
    id: "notification-0001",
    schoolId: "school-balanga",
    studentId: "student-0001",
    kind: "time_in",
    tappedAt: "2026-06-20T07:56:00Z",
    read: false,
  },
  {
    id: "notification-0002",
    schoolId: "school-balanga",
    studentId: "student-0002",
    kind: "time_in",
    tappedAt: "2026-06-20T07:57:00Z",
    read: true,
  },
  {
    id: "notification-0003",
    schoolId: "school-balanga",
    studentId: "student-0001",
    kind: "time_out",
    tappedAt: "2026-06-20T16:05:00Z",
    read: false,
  },
];
