import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { StatusPill } from "@/components/status-pill";
import { schoolRepository, studentRepository, tapRepository } from "@/data/repositories";
import { DayTapList } from "@/features/attendance/day-tap-list";
import { dayTapSummary, studentStatus } from "@/features/attendance/status";
import { parentLinks } from "@/features/parents/parent-links";
import { gradeAndSection, StudentAvatar, studentName } from "@/features/students/student-display";
import { getNow } from "@/lib/clock";
import { getParentSession } from "@/lib/parent-session";
import { formatSchoolDate, formatSchoolTime, schoolTimeToIso } from "@/lib/school-time";
import { childToday } from "@/services/parents/children-today";

/**
 * One linked child's day (Step 59.5), opened from their card: every tap of
 * today, labelled in or out by its order, then their last few taps on any
 * day. A child who isn't this parent's is "not found", the same as one who
 * doesn't exist, never "forbidden".
 */
export default async function ParentChildPage({ params }: PageProps<"/parent/child/[id]">) {
  const session = await getParentSession();
  if (!session) redirect("/parent/login");

  const { id } = await params;
  const child = await childToday(session.parentId, id, getNow(), {
    links: parentLinks,
    students: studentRepository,
    schools: schoolRepository,
    taps: tapRepository,
  });
  if (!child) notFound();

  const { student, day, todayTaps, recentTaps } = child;
  const { taps } = dayTapSummary(student.id, todayTaps, day);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/parent"
        className="-ml-1 inline-flex min-h-11 items-center gap-1 self-start rounded-md px-1 text-sm font-medium text-link focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
        My children
      </Link>

      <header className="flex items-center gap-4">
        <StudentAvatar student={student} className="w-20 rounded-lg text-xl" />
        <div className="flex min-w-0 flex-col items-start gap-1">
          <h1 className="font-heading text-2xl font-semibold wrap-break-word text-foreground lg:text-3xl">
            {studentName(student)}
          </h1>
          <p className="text-sm text-muted-foreground">{gradeAndSection(student)}</p>
          <StatusPill status={studentStatus(student.id, todayTaps, day)} flexible={day.flexible} className="mt-1" />
        </div>
      </header>

      <section aria-labelledby="today-heading" className="flex flex-col gap-2">
        <div>
          <h2 id="today-heading" className="font-heading text-lg font-semibold text-foreground">
            Today
          </h2>
          <p className="text-sm text-muted-foreground">{formatSchoolDate(schoolTimeToIso(day.date, "12:00"))}</p>
        </div>
        {taps.length === 0 ? (
          <p className="text-sm text-muted-foreground">No taps yet today.</p>
        ) : (
          <DayTapList taps={taps.map(({ tap, kind }) => ({ id: tap.id, tappedAt: tap.tappedAt, kind }))} />
        )}
      </section>

      <section aria-labelledby="recent-heading" className="flex flex-col gap-2">
        <h2 id="recent-heading" className="font-heading text-lg font-semibold text-foreground">
          Recent taps
        </h2>
        {recentTaps.length === 0 ? (
          <p className="text-sm text-muted-foreground">No taps on record yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {recentTaps.map((tap) => (
              <li key={tap.id} className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-foreground">{formatSchoolDate(tap.tappedAt)}</span>
                <time dateTime={tap.tappedAt} className="text-muted-foreground tabular-nums">
                  {formatSchoolTime(tap.tappedAt)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
