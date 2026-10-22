import { describe, expect, it } from "vitest";
import { createMockNotificationRepository } from "@/data/repositories/notification-repository";
import { createMockParentStudentLinkRepository } from "@/data/repositories/parent-student-link-repository";
import { createMockStudentRepository } from "@/data/repositories/student-repository";
import type { Notification, ParentStudentLink } from "@/features/parents/types";
import type { Student } from "@/features/students/types";
import {
  countParentUnread,
  listParentNotifications,
  markAllParentNotificationsRead,
  markParentNotificationRead,
  type ParentNotificationsDeps,
} from "./notifications";

function student(id: string, schoolId: string): Student {
  return {
    id,
    schoolId,
    firstName: id,
    lastName: "Cruz",
    birthDate: "2012-03-14",
    gradeLevel: 8,
    section: "Rizal",
    guardianName: "Maria Cruz",
    guardianMobile: "09171234567",
  };
}

function link(parentId: string, child: Student): ParentStudentLink {
  return {
    id: `link-${parentId}-${child.id}`,
    schoolId: child.schoolId,
    parentId,
    studentId: child.id,
    linkedAt: "2026-06-01T00:00:00.000Z",
  };
}

/** A UUID-shaped id that sorts by `n`, so a test can say which comes first on a tie. */
function uuid(n: number): string {
  return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

function notification(id: string, child: Student, tappedAt: string, read = false): Notification {
  return {
    id,
    schoolId: child.schoolId,
    studentId: child.id,
    kind: "time_in",
    tappedAt,
    read,
    recipientParentId: null,
  };
}

/** Step 55.2: `aboutParentId` linked `child`, told to `recipientParentId`. */
function linkNotice(id: string, child: Student, recipientParentId: string, aboutParentId: string): Notification {
  return {
    id,
    schoolId: child.schoolId,
    studentId: child.id,
    kind: "guardian_linked",
    tappedAt: "2026-06-20T18:12:00.000Z",
    read: false,
    recipientParentId,
    aboutParentId,
  };
}

/** Ana's second guardian, who linked her after parent-1. */
const parent3 = { id: "parent-3", firstName: "Rosa", lastName: "Santos", mobile: "09170000000", email: "rosa@x.com" };

const ana = student("student-ana", "school-a");
const ben = student("student-ben", "school-b");
const other = student("student-other", "school-a");

function deps(notifications: Notification[]): ParentNotificationsDeps {
  return {
    links: createMockParentStudentLinkRepository(
      [link("parent-1", ana), link("parent-1", ben), link("parent-2", other), link("parent-3", ana)],
      {
        latencyMs: 0,
      },
    ),
    students: createMockStudentRepository([ana, ben, other], { latencyMs: 0 }),
    notifications: createMockNotificationRepository(notifications, { latencyMs: 0, parents: [parent3] }),
  };
}

const SAME_TIME = "2026-06-20T07:56:00.000Z";

describe("listParentNotifications", () => {
  it("pages through both children, newest first, with no repeats or gaps, even when siblings tie", async () => {
    const rows = [
      // Ana and Ben tap in the same millisecond, interleaved by id.
      notification(uuid(1), ana, SAME_TIME),
      notification(uuid(2), ben, SAME_TIME),
      notification(uuid(3), ana, SAME_TIME),
      notification(uuid(4), ben, SAME_TIME),
      notification(uuid(5), ana, "2026-06-20T16:05:00.000Z"),
      notification(uuid(6), ben, "2026-06-19T07:50:00.000Z"),
      notification(uuid(7), other, SAME_TIME),
    ];
    const d = deps(rows);

    const seen: string[] = [];
    let before: string | null = null;
    for (let page = 0; page < 10; page++) {
      const result = await listParentNotifications("parent-1", { before, limit: 2 }, d);
      seen.push(...result.items.map((item) => item.notification.id));
      if (!result.nextBefore) break;
      before = result.nextBefore;
    }

    expect(seen).toEqual([uuid(5), uuid(4), uuid(3), uuid(2), uuid(1), uuid(6)]);
  });

  it("says there's nothing older on the last page", async () => {
    const result = await listParentNotifications(
      "parent-1",
      { limit: 30 },
      deps([notification(uuid(1), ana, SAME_TIME)]),
    );
    expect(result.items).toHaveLength(1);
    expect(result.nextBefore).toBeNull();
  });

  it("joins each notification with its child", async () => {
    const result = await listParentNotifications("parent-1", {}, deps([notification(uuid(1), ben, SAME_TIME)]));
    // Only the name: the bell and the feed send this to the browser.
    expect(result.items[0].student).toEqual({ id: ben.id, firstName: ben.firstName, lastName: ben.lastName });
  });

  it("treats a bad cursor as the first page", async () => {
    const rows = [notification(uuid(1), ana, SAME_TIME)];
    await expect(listParentNotifications("parent-1", { before: "not-a-cursor" }, deps(rows))).resolves.toEqual(
      await listParentNotifications("parent-1", {}, deps(rows)),
    );
  });

  it("keeps a page between 1 and 50, whatever the limit asked for", async () => {
    const rows = Array.from({ length: 60 }, (_, n) =>
      notification(uuid(n), ana, `2026-06-${10 + (n % 10)}T07:56:00.000Z`),
    );
    const d = deps(rows);
    const size = async (limit: number) => (await listParentNotifications("parent-1", { limit }, d)).items.length;

    await expect(size(-5)).resolves.toBe(1);
    await expect(size(0)).resolves.toBe(1);
    await expect(size(500)).resolves.toBe(50);
    await expect(size(1.5)).resolves.toBe(30);
  });

  it("never includes another parent's child", async () => {
    const result = await listParentNotifications("parent-1", {}, deps([notification(uuid(7), other, SAME_TIME)]));
    expect(result.items).toEqual([]);
  });
});

describe("countParentUnread", () => {
  it("adds up the children's unread, ignoring read ones and other parents' children", async () => {
    const rows = [
      notification(uuid(1), ana, SAME_TIME),
      notification(uuid(2), ben, SAME_TIME),
      notification(uuid(3), ben, SAME_TIME, true),
      notification(uuid(4), other, SAME_TIME),
    ];
    await expect(countParentUnread("parent-1", deps(rows))).resolves.toBe(2);
  });

  it("stops at 10 across children", async () => {
    const rows = [
      ...Array.from({ length: 7 }, (_, n) => notification(uuid(n), ana, SAME_TIME)),
      ...Array.from({ length: 7 }, (_, n) => notification(uuid(100 + n), ben, SAME_TIME)),
    ];
    await expect(countParentUnread("parent-1", deps(rows))).resolves.toBe(10);
  });
});

describe("marking read", () => {
  it("marks one of the parent's own notifications read", async () => {
    const d = deps([notification(uuid(1), ana, SAME_TIME)]);
    await expect(markParentNotificationRead("parent-1", uuid(1), d)).resolves.toBe(true);
    await expect(countParentUnread("parent-1", d)).resolves.toBe(0);
  });

  it("refuses another parent's notification, and leaves it unread", async () => {
    const d = deps([notification(uuid(7), other, SAME_TIME)]);
    await expect(markParentNotificationRead("parent-1", uuid(7), d)).resolves.toBe(false);
    await expect(countParentUnread("parent-2", d)).resolves.toBe(1);
  });

  it("marks all of the parent's children's notifications read, and no one else's", async () => {
    const d = deps([
      notification(uuid(1), ana, SAME_TIME),
      notification(uuid(2), ben, SAME_TIME),
      notification(uuid(7), other, SAME_TIME),
    ]);
    await markAllParentNotificationsRead("parent-1", d);
    await expect(countParentUnread("parent-1", d)).resolves.toBe(0);
    await expect(countParentUnread("parent-2", d)).resolves.toBe(1);
  });
});

describe("link notices (Step 55.2)", () => {
  // parent-3 linked Ana, so parent-1, already linked, was told.
  const rows = () => [notification(uuid(1), ana, SAME_TIME), linkNotice(uuid(2), ana, "parent-1", "parent-3")];

  it("reach the guardian who's told, with the new parent's name, and not the parent who linked", async () => {
    const d = deps(rows());
    const forOne = await listParentNotifications("parent-1", {}, d);
    expect(forOne.items.map((item) => item.notification.id)).toEqual([uuid(2), uuid(1)]);
    expect(forOne.items[0].notification.aboutParent).toEqual({ firstName: "Rosa", lastName: "Santos" });

    const forThree = await listParentNotifications("parent-3", {}, d);
    expect(forThree.items.map((item) => item.notification.id)).toEqual([uuid(1)]);
  });

  it("count as unread, and are marked read, only for the guardian who's told", async () => {
    const d = deps(rows());
    await expect(countParentUnread("parent-1", d)).resolves.toBe(2);
    await expect(countParentUnread("parent-3", d)).resolves.toBe(1);

    await expect(markParentNotificationRead("parent-3", uuid(2), d)).resolves.toBe(false);
    await markAllParentNotificationsRead("parent-3", d);
    // parent-3's "mark all" read the shared tap, never parent-1's notice.
    await expect(countParentUnread("parent-1", d)).resolves.toBe(1);
    await expect(markParentNotificationRead("parent-1", uuid(2), d)).resolves.toBe(true);
    await expect(countParentUnread("parent-1", d)).resolves.toBe(0);
  });
});
