import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import type { StudentExport } from "@/features/students/privacy-export";
import { isRetryable, retryOnce } from "./prisma-errors";
import { lockStudentForLink } from "./prisma-parent-student-link-repository";
import { toStudent } from "./prisma-student-repository";
import type { StudentDataRepository } from "./student-data-repository";

/** One of ten pool connections: well past a student's few hundred rows, well short of holding up the gate. */
const DELETE_TRANSACTION = { maxWait: 5_000, timeout: 10_000 };

export function createPrismaStudentDataRepository(db: PrismaClient = prisma): StudentDataRepository {
  return {
    async exportOf(schoolId, studentId) {
      const student = await db.student.findFirst({ where: { id: studentId, schoolId } });
      if (!student) return null;

      // One after another, not together: this is a rare request and shouldn't take
      // half the pool's connections at once.
      const cards = await db.card.findMany({ where: { studentId, schoolId }, orderBy: { linkedAt: "asc" } });
      const serials = cards.map((card) => card.serial);
      const taps = await db.tap.findMany({
        where: { schoolId, OR: [{ studentId }, ...(serials.length ? [{ cardSerial: { in: serials } }] : [])] },
        orderBy: { tappedAt: "asc" },
      });
      const alerts = await db.alert.findMany({ where: { studentId, schoolId }, orderBy: { createdAt: "asc" } });
      const notices = await db.notification.findMany({
        where: { studentId, schoolId, kind: { in: ["time_in", "time_out"] } },
        orderBy: { tappedAt: "asc" },
      });
      const links = await db.parentStudentLink.findMany({
        where: { studentId, schoolId },
        orderBy: { linkedAt: "asc" },
        include: { parent: { select: { firstName: true, lastName: true } } },
      });

      const result: StudentExport = {
        student: toStudent(student),
        addedAt: student.createdAt.toISOString(),
        cards: cards.map((card) => ({
          serial: card.serial,
          status: card.status,
          linkedAt: card.linkedAt.toISOString(),
        })),
        taps: taps.map((tap) => ({
          tappedAt: tap.tappedAt.toISOString(),
          source: tap.source,
          lostCard: tap.studentId === null,
        })),
        alerts: alerts.map((alert) => ({
          type: alert.type,
          createdAt: alert.createdAt.toISOString(),
          acknowledged: alert.acknowledged,
        })),
        notices: notices.map((notice) => ({
          kind: notice.kind,
          tappedAt: notice.tappedAt.toISOString(),
          read: notice.read,
        })),
        linkedParents: links.map((link) => ({
          firstName: link.parent.firstName,
          lastName: link.parent.lastName,
          linkedAt: link.linkedAt.toISOString(),
        })),
      };
      return result;
    },

    async deleteAll(schoolId, studentId, actor) {
      // Once more if it loses a race: a deadlock, or a tap saved for this
      // student in the same instant, which fails the final delete on its
      // foreign key (Restrict) and is then simply removed too. The catch is
      // outside the transaction, since a failed statement aborts it.
      return retryOnce(
        () =>
          db.$transaction(async (tx) => {
            const inSchool = { where: { id: studentId, schoolId }, select: { photoKey: true } } as const;
            if (!(await tx.student.findFirst(inSchool))) return null;

            // Takes turns with linking this student to a parent, and removing one, and with
            // another delete of the same student (a double click).
            await lockStudentForLink(tx, studentId);
            // Read again under the lock: a delete that held it first has removed the student by
            // now, and this one has nothing left to do (it would otherwise fail on its last line).
            const student = await tx.student.findFirst(inSchool);
            if (!student) return null;

            // A lost card's tap has no student, only the card's serial, so theirs are found by both.
            const serials = (await tx.card.findMany({ where: { studentId }, select: { serial: true } })).map(
              (card) => card.serial,
            );
            const theirs = {
              schoolId,
              OR: [{ studentId }, ...(serials.length ? [{ cardSerial: { in: serials } }] : [])],
            };

            // Notifications first, then the links: the order the push fan-out takes them in. It
            // locks notification rows (FOR UPDATE SKIP LOCKED, so it skips the ones held here),
            // then takes FOR SHARE on the links, so this waits for a fan-out in progress instead
            // of crossing it. The deliveries go with the notifications (Cascade).
            await tx.notification.deleteMany({ where: { studentId, schoolId } });
            await tx.parentStudentLink.deleteMany({ where: { studentId, schoolId } });
            await tx.linkBlock.deleteMany({ where: { studentId, schoolId } });
            // An alert holds its tap (Restrict), so alerts go before taps.
            await tx.alert.deleteMany({ where: { schoolId, OR: [{ studentId }, { tap: theirs }] } });
            await tx.tap.deleteMany({ where: theirs });
            await tx.card.deleteMany({ where: { studentId, schoolId } });
            // In the same transaction: a deletion never happens without its record, and no name goes in it.
            await tx.auditEvent.create({
              data: {
                schoolId,
                actorId: actor.id,
                actorRole: actor.role,
                action: "student_deleted",
                targetType: "student",
                targetId: studentId,
              },
            });
            await tx.student.delete({ where: { id: studentId } });
            return { photoKey: student.photoKey };
          }, DELETE_TRANSACTION),
        isRetryable,
      );
    },
  };
}

/** The one instance the rest of the app actually imports. */
export const studentDataRepository = createPrismaStudentDataRepository();
