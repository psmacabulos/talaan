import type { LinkedGuardian, Notification, Parent, ParentStudentLink, RecentLink } from "@/features/parents/types";
import type { Student } from "@/features/students/types";
import { seedNotifications, seedParentStudentLinks, seedParents, seedStudents } from "@/data/seed";
import { DEFAULT_LATENCY_MS, simulateLatency } from "./latency";

export interface ParentStudentLinkRepository {
  /** Every link for a given parent — their linked children. */
  listByParent(parentId: string): Promise<ParentStudentLink[]>;
  /** Every link for a given student — their linked guardians. */
  listByStudent(studentId: string): Promise<ParentStudentLink[]>;
  /** Every link within a school. */
  listBySchool(schoolId: string): Promise<ParentStudentLink[]>;
  /**
   * The links of these students, at `schoolId` only, each with the parent's
   * name and mobile, oldest first, in one query (Step 55.3's drawer). Never
   * the parent's email.
   */
  listGuardiansInSchool(schoolId: string, studentIds: string[]): Promise<LinkedGuardian[]>;
  /** How many links `schoolId` got since `since`, and the newest `take` of them, with names (Step 55.3's dashboard). */
  listRecentInSchool(schoolId: string, since: string, take: number): Promise<{ total: number; links: RecentLink[] }>;
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

/** In the order the links were made; the id breaks ties. */
function firstLinkedFirst(a: ParentStudentLink, b: ParentStudentLink): number {
  return a.linkedAt.localeCompare(b.linkedAt) || a.id.localeCompare(b.id);
}

export function createMockParentStudentLinkRepository(
  data: ParentStudentLink[] = seedParentStudentLinks,
  options: { latencyMs?: number; notifications?: Notification[]; parents?: Parent[]; students?: Student[] } = {},
): ParentStudentLinkRepository {
  const latencyMs = options.latencyMs ?? DEFAULT_LATENCY_MS;
  const notifications = options.notifications ?? seedNotifications;
  const parents = options.parents ?? seedParents;
  const students = options.students ?? seedStudents;

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
    async listGuardiansInSchool(schoolId, studentIds) {
      await simulateLatency(latencyMs);
      return data
        .filter((link) => link.schoolId === schoolId && studentIds.includes(link.studentId))
        .sort(firstLinkedFirst)
        .flatMap((link) => {
          const parent = parents.find((candidate) => candidate.id === link.parentId);
          if (!parent) return [];
          const { firstName, lastName, mobile } = parent;
          return [
            {
              linkId: link.id,
              studentId: link.studentId,
              linkedAt: link.linkedAt,
              parent: { firstName, lastName, mobile },
            },
          ];
        });
    },
    async listRecentInSchool(schoolId, since, take) {
      await simulateLatency(latencyMs);
      const recent = data
        .filter((link) => link.schoolId === schoolId && Date.parse(link.linkedAt) >= Date.parse(since))
        .sort((a, b) => firstLinkedFirst(b, a));
      const links = recent.slice(0, take).flatMap((link) => {
        const parent = parents.find((candidate) => candidate.id === link.parentId);
        const student = students.find((candidate) => candidate.id === link.studentId);
        if (!parent || !student) return [];
        return [
          {
            linkId: link.id,
            linkedAt: link.linkedAt,
            parent: { firstName: parent.firstName, lastName: parent.lastName },
            student: { id: student.id, firstName: student.firstName, lastName: student.lastName },
          },
        ];
      });
      return { total: recent.length, links };
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
