import type { Notification, ParentStudentLink } from "@/features/parents/types";
import { seedNotifications, seedParentStudentLinks } from "@/data/seed";
import { DEFAULT_LATENCY_MS, simulateLatency } from "./latency";

export interface ParentStudentLinkRepository {
  /** Every link for a given parent — their linked children. */
  listByParent(parentId: string): Promise<ParentStudentLink[]>;
  /** Every link for a given student — their linked guardians. */
  listByStudent(studentId: string): Promise<ParentStudentLink[]>;
  /** Every link within a school. */
  listBySchool(schoolId: string): Promise<ParentStudentLink[]>;
  /**
   * Step 22's "link a child", with Step 55.2's notices: saves the link and,
   * in the same transaction, one `guardian_linked` notification for each of
   * the child's other guardians at that school, naming the new parent. Two
   * parents linking one child at once take turns, so the second always
   * tells the first. The caller checks "already linked" first (via
   * `listByParent`), for a friendly message; this returns `null` when the
   * parent already has a link to this student anyway (the same form sent
   * twice at once), since only one can be kept, and then makes no notice.
   */
  createWithNotices(link: ParentStudentLink): Promise<LinkWithNotices | null>;
}

/** A new link, and how many guardians it told (each one gets a push to send). */
export type LinkWithNotices = { link: ParentStudentLink; noticesMade: number };

export function createMockParentStudentLinkRepository(
  data: ParentStudentLink[] = seedParentStudentLinks,
  options: { latencyMs?: number; notifications?: Notification[] } = {},
): ParentStudentLinkRepository {
  const latencyMs = options.latencyMs ?? DEFAULT_LATENCY_MS;
  const notifications = options.notifications ?? seedNotifications;

  return {
    async listByParent(parentId) {
      await simulateLatency(latencyMs);
      return data.filter((link) => link.parentId === parentId);
    },
    async listByStudent(studentId) {
      await simulateLatency(latencyMs);
      return data.filter((link) => link.studentId === studentId);
    },
    async listBySchool(schoolId) {
      await simulateLatency(latencyMs);
      return data.filter((link) => link.schoolId === schoolId);
    },
    async createWithNotices(link) {
      await simulateLatency(latencyMs);
      const taken = data.some(
        (existing) =>
          existing.id === link.id || (existing.parentId === link.parentId && existing.studentId === link.studentId),
      );
      if (taken) return null;
      const others = data.filter(
        (existing) => existing.studentId === link.studentId && existing.schoolId === link.schoolId,
      );
      data.push(link);
      for (const other of others) {
        notifications.push({
          id: crypto.randomUUID(),
          schoolId: link.schoolId,
          studentId: link.studentId,
          kind: "guardian_linked",
          tappedAt: link.linkedAt,
          read: false,
          recipientParentId: other.parentId,
          aboutParentId: link.parentId,
        });
      }
      return { link, noticesMade: others.length };
    },
  };
}
