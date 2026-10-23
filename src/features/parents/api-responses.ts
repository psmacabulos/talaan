import type { AttendanceStatus } from "@/components/status-pill";
import { dayTapSummary, studentStatus, type SchoolDay } from "@/features/attendance/status";
import type { Tap } from "@/features/attendance/types";
import type { NotificationPreference, School } from "@/features/schools/types";
import { photoPath } from "@/features/students/photo";
import { toSchoolOffsetIso } from "@/lib/school-time";
import type { ChildToday } from "@/services/parents/children-today";
import type { ParentNotificationItem } from "./notification-format";
import type { Notification, NotificationKind, Parent, ParentName } from "./types";

/**
 * The parent API's answers (Step 53.3, docs/PARENT-APP-BRIEF.md). Every
 * field is copied one by one, like `toGateTapResponse`, so a new field on a
 * student never reaches a phone by accident: never the LRN, birth date or
 * guardian. Times carry the school's offset ("+08:00").
 */

export type ApiErrorCode =
  | "invalid_input"
  | "unauthorized"
  | "wrong_credentials"
  | "too_many_tries"
  | "not_found"
  | "conflict"
  | "link_blocked"
  | "invalid_code"
  | "unavailable";

const STATUS: Record<ApiErrorCode, number> = {
  invalid_input: 400,
  unauthorized: 401,
  wrong_credentials: 401,
  too_many_tries: 429,
  not_found: 404,
  conflict: 409,
  // The school removed this parent from this child (Step 55.4). Only ever
  // answered after the details matched, so it reveals nothing new.
  link_blocked: 403,
  // A reset code that's wrong, expired, used up or replaced (Step 55.6).
  // Never 401: the app treats every 401 as "signed out".
  invalid_code: 400,
  // No email can go right now: the day's limit, or a live server not yet
  // sending email (Step 55.6), so the app never says "sent" when nothing was.
  unavailable: 503,
};

/** The plain messages for errors that have no more specific one. */
export const API_MESSAGES = {
  invalidInput: "Check the highlighted fields.",
  unauthorized: "Please sign in again.",
  notFound: "That's no longer available.",
} as const;

/** The one error shape: `{ error: { code, message, fields? } }`, so the app has one error handler. */
export function apiError(code: ApiErrorCode, message: string, fields?: Partial<Record<string, string>>): Response {
  return Response.json({ error: fields ? { code, message, fields } : { code, message } }, { status: STATUS[code] });
}

export type ParentJson = { id: string; firstName: string; lastName: string; email: string; mobile: string };

export function toParentJson(parent: Parent): ParentJson {
  return {
    id: parent.id,
    firstName: parent.firstName,
    lastName: parent.lastName,
    email: parent.email,
    mobile: parent.mobile,
  };
}

export type SchoolJson = { id: string; name: string };

export function toSchoolJson(school: School): SchoolJson {
  return { id: school.id, name: school.name };
}

export type ChildTodayJson = {
  id: string;
  firstName: string;
  lastName: string;
  gradeLevel: number;
  section: string;
  photo: string | null;
  school: { id: string; name: string; notificationPreference: NotificationPreference };
  today: {
    date: string;
    status: AttendanceStatus;
    flexible: boolean;
    timeIn: string | null;
    timeOut: string | null;
    tapCount: number;
  };
};

/** One linked child for `/me` and linking. Null if their school is gone, which nothing allows today (schools are never deleted). */
export function toChildTodayJson(child: ChildToday): ChildTodayJson | null {
  const { student, school, day, todayTaps } = child;
  if (!school) return null;
  const summary = dayTapSummary(student.id, todayTaps, day);
  return {
    id: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    gradeLevel: student.gradeLevel,
    section: student.section,
    photo: student.photoKey ? photoPath(student.photoKey) : null,
    school: { id: school.id, name: school.name, notificationPreference: school.notificationPreference },
    today: {
      date: day.date,
      status: studentStatus(student.id, todayTaps, day),
      flexible: day.flexible,
      timeIn: summary.timeIn ? toSchoolOffsetIso(summary.timeIn.tappedAt) : null,
      timeOut: summary.timeOut ? toSchoolOffsetIso(summary.timeOut.tappedAt) : null,
      tapCount: summary.taps.length,
    },
  };
}

export type DayTapsJson = {
  date: string;
  status: AttendanceStatus;
  flexible: boolean;
  taps: { at: string; kind: NotificationKind }[];
};

/** One child's day for `children/:id/taps`: every tap, labelled time in or time out by its order. */
export function toDayTapsJson(studentId: string, taps: Tap[], day: SchoolDay): DayTapsJson {
  return {
    date: day.date,
    status: studentStatus(studentId, taps, day),
    flexible: day.flexible,
    taps: dayTapSummary(studentId, taps, day).taps.map(({ tap, kind }) => ({
      at: toSchoolOffsetIso(tap.tappedAt),
      kind,
    })),
  };
}

export type NotificationJson = {
  id: string;
  childId: string;
  childName: string;
  kind: Notification["kind"];
  at: string;
  read: boolean;
  /** `guardian_linked` only (Step 55.2): who linked, null once their account is deleted. */
  guardian?: ParentName | null;
};

/**
 * One feed entry for `notifications` (Step 53.4): the child's id and name,
 * never more of them. A link notice (Step 55.2) adds the linking parent's
 * two names, never their email or mobile.
 */
export function toNotificationJson({ notification, student }: ParentNotificationItem): NotificationJson {
  const entry: NotificationJson = {
    id: notification.id,
    childId: student.id,
    childName: `${student.firstName} ${student.lastName}`,
    kind: notification.kind,
    at: toSchoolOffsetIso(notification.tappedAt),
    read: notification.read,
  };
  if (notification.kind !== "guardian_linked") return entry;
  const { aboutParent } = notification;
  return { ...entry, guardian: aboutParent && { firstName: aboutParent.firstName, lastName: aboutParent.lastName } };
}
