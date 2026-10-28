import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { schoolRepository, studentRepository, tapRepository } from "@/data/repositories";
import { getNow } from "@/lib/clock";
import { getParentSession } from "@/lib/parent-session";
import { ChildCard } from "@/features/parents/child-card";
import { parentLinks } from "@/features/parents/parent-links";
import { childrenToday } from "@/services/parents/children-today";

export default async function ParentHomePage() {
  const session = await getParentSession();
  if (!session) redirect("/parent/login");

  // Each child at their own link's school (Step 53), judged by its own
  // times, with today's taps only: the recent ones are on each child's page
  // (Step 59.5).
  const children = await childrenToday(
    session.parentId,
    getNow(),
    { links: parentLinks, students: studentRepository, schools: schoolRepository, taps: tapRepository },
    { recentTaps: 0 },
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <HomeHeading />

      {children.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No linked children yet"
          description="Link your child using their LRN, last name and birth date to see their attendance here."
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {children.map((child) => (
            <li key={child.student.id}>
              <ChildCard child={child} />
            </li>
          ))}
        </ul>
      )}

      {/* Below the children, as in the parent app: a parent opens this page
          to see them, and links a child once. */}
      <Button asChild variant={children.length === 0 ? "default" : "outline"} className="self-center">
        <Link href="/parent/link-child">Link a child</Link>
      </Button>
    </div>
  );
}

/**
 * "My children" and the line under it, with the parent app's school
 * illustration in the corner the heading leaves empty (Step 59.5). The
 * picture says nothing a parent needs, so screen readers skip it. The
 * heading keeps clear of it and wraps rather than run under it; the line
 * under the heading runs the full width below the picture.
 */
function HomeHeading() {
  return (
    <header className="flex flex-col gap-1">
      <div className="flex items-end justify-between gap-3">
        <h1 className="font-heading text-2xl font-semibold wrap-break-word text-foreground lg:text-3xl">My children</h1>
        <Image
          src="/brand/illustration-school.png"
          alt=""
          width={360}
          height={240}
          loading="eager"
          sizes="(min-width: 640px) 160px, 120px"
          className="h-auto w-30 shrink-0 sm:w-40"
        />
      </div>
      <p className="text-sm text-muted-foreground lg:text-base">Check who&apos;s in school, the moment they tap in.</p>
    </header>
  );
}
