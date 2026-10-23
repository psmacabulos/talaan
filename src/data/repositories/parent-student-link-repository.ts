import type {
  LinkedGuardian,
  Notification,
  Parent,
  ParentStudentLink,
  RecentLink,
  RemovedGuardian,
} from "@/features/parents/types";
import type { Student } from "@/features/students/types";
import type { Staff } from "@/features/staff/types";
import { seedNotifications, seedParentStudentLinks, seedParents, seedStaff, seedStudents } from "@/data/seed";
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
   * `listByParent`), for a friendly message; this answers `already_linked`
   * when the parent has a link to this student anyway (the same form sent
   * twice at once), since only one can be kept, and `blocked` when the
   * school removed this parent from the child (Step 55.4). Neither makes a
   * notice.
   */
  createWithNotices(link: ParentStudentLink): Promise<CreateLinkResult>;
  /**
   * Step 55.4's "Remove": deletes one link at `schoolId` and blocks that
   * parent from the child, in one transaction, with the parent's pushes
   * about the child that haven't gone yet. Null if there's no such link (any
   * more): another principal may have removed it a moment ago.
   */
  removeInSchool(
    schoolId: string,
    linkId: string,
    removedByStaffId: string,
  ): Promise<{ parentId: string; studentId: string } | null>;
  /** The blocks of these students at `schoolId`, with the parent's name and who removed them, newest first. */
  listBlocksInSchool(schoolId: string, studentIds: string[]): Promise<RemovedGuardian[]>;
  /** Step 55.4's "Allow again": deletes one block at `schoolId`. True if there was one. */
  allowAgainInSchool(schoolId: string, blockId: string): Promise<boolean>;
}

/** What linking did: a new link and how many guardians it told (each gets a push), or why there's none. */
export type CreateLinkResult =
  | { outcome: "linked"; link: ParentStudentLink; noticesMade: number }
  | { outcome: "already_linked" }
  | { outcome: "blocked" };

/** A school's record that it removed a parent from a child (the mock's stand-in for the `LinkBlock` table). */
export type LinkBlockRecord = {
  id: string;
  schoolId: string;
  parentId: string;
  studentId: string;
  removedAt: string;
  removedByStaffId: string | null;
};

/** In the order the links were made; the id breaks ties. */
function firstLinkedFirst(a: ParentStudentLink, b: ParentStudentLink): number {
  return a.linkedAt.localeCompare(b.linkedAt) || a.id.localeCompare(b.id);
}

export function createMockParentStudentLinkRepository(
  data: ParentStudentLink[] = seedParentStudentLinks,
  options: {
    latencyMs?: number;
    notifications?: Notification[];
    parents?: Parent[];
    students?: Student[];
    blocks?: LinkBlockRecord[];
    staff?: Staff[];
  } = {},
): ParentStudentLinkRepository {
  const latencyMs = options.latencyMs ?? DEFAULT_LATENCY_MS;
  const notifications = options.notifications ?? seedNotifications;
  const parents = options.parents ?? seedParents;
  const students = options.students ?? seedStudents;
  const blocks = options.blocks ?? [];
  const staff = options.staff ?? seedStaff;

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
      if (blocks.some((block) => block.parentId === link.parentId && block.studentId === link.studentId)) {
        return { outcome: "blocked" };
      }
      const taken = data.some(
        (existing) =>
          existing.id === link.id || (existing.parentId === link.parentId && existing.studentId === link.studentId),
      );
      if (taken) return { outcome: "already_linked" };
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
      return { outcome: "linked", link, noticesMade: others.length };
    },
    async removeInSchool(schoolId, linkId, removedByStaffId) {
      await simulateLatency(latencyMs);
      const index = data.findIndex((link) => link.id === linkId && link.schoolId === schoolId);
      if (index === -1) return null;
      const [{ parentId, studentId }] = data.splice(index, 1);
      if (!blocks.some((block) => block.parentId === parentId && block.studentId === studentId)) {
        blocks.push({
          id: crypto.randomUUID(),
          schoolId,
          parentId,
          studentId,
          removedAt: new Date().toISOString(),
          removedByStaffId,
        });
      }
      return { parentId, studentId };
    },
    async listBlocksInSchool(schoolId, studentIds) {
      await simulateLatency(latencyMs);
      return blocks
        .filter((block) => block.schoolId === schoolId && studentIds.includes(block.studentId))
        .sort((a, b) => b.removedAt.localeCompare(a.removedAt))
        .flatMap((block) => {
          const parent = parents.find((candidate) => candidate.id === block.parentId);
          if (!parent) return [];
          const remover = staff.find((candidate) => candidate.id === block.removedByStaffId);
          return [
            {
              blockId: block.id,
              studentId: block.studentId,
              removedAt: block.removedAt,
              parent: { firstName: parent.firstName, lastName: parent.lastName },
              removedBy: remover ? { firstName: remover.firstName, lastName: remover.lastName } : null,
            },
          ];
        });
    },
    async allowAgainInSchool(schoolId, blockId) {
      await simulateLatency(latencyMs);
      const index = blocks.findIndex((block) => block.id === blockId && block.schoolId === schoolId);
      if (index === -1) return false;
      blocks.splice(index, 1);
      return true;
    },
  };
}
