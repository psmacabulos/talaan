import { z } from "zod";
import { parentStudentLinkRepository, schoolRepository, studentRepository, tapRepository } from "@/data/repositories";
import { DEFAULT_ATTENDANCE_TIMES, schoolDayFor, schoolToday } from "@/features/attendance/status";
import { requireParent } from "@/features/parents/api-request";
import { API_MESSAGES, apiError, toDayTapsJson } from "@/features/parents/api-responses";
import { getNow } from "@/lib/clock";

const dateSchema = z.iso.date();

/**
 * One linked child's taps on one day (Step 53.3), `?date=YYYY-MM-DD`, today
 * on the child's school's calendar when it's left out. Judged by that
 * school's times. A child who isn't this parent's is 404, like one that
 * doesn't exist, never "forbidden".
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const caller = await requireParent(request);
  if (caller instanceof Response) return caller;

  const { id } = await params;
  const links = await parentStudentLinkRepository.listByParent(caller.parentId);
  const link = links.find((candidate) => candidate.studentId === id);
  if (!link) return apiError("not_found", API_MESSAGES.notFound);

  const rawDate = new URL(request.url).searchParams.get("date");
  if (rawDate !== null && !dateSchema.safeParse(rawDate).success) {
    return apiError("invalid_input", API_MESSAGES.invalidInput, { date: "Use a date like 2026-10-13" });
  }

  const student = await studentRepository.getInSchool(link.schoolId, id);
  if (!student) return apiError("not_found", API_MESSAGES.notFound);
  const times = (await schoolRepository.getById(link.schoolId)) ?? DEFAULT_ATTENDANCE_TIMES;
  const now = getNow();
  const day = schoolDayFor(rawDate ?? schoolToday(now, times).date, now, times);

  const taps = await tapRepository.listByStudentOnDate(link.schoolId, student.id, day.date);
  return Response.json(toDayTapsJson(student.id, taps, day));
}
