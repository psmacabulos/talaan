import Link from "next/link";
import { UserPlus } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { formatSchoolDate, formatSchoolTime } from "@/lib/school-time";
import type { RecentLink } from "./types";

/** How far back the dashboard's "New parent links" looks (Step 55.3). */
export const NEW_LINKS_DAYS = 7;

/** How many of them it lists; the pill counts them all. */
export const NEW_LINKS_SHOWN = 5;

/** The pill beside the card's title: "3 this week". */
export function newLinksLabel(total: number): string {
  return `${total} this week`;
}

/**
 * The dashboard's "New parent links" (Step 55.3), for principals and super
 * admins: the school's newest links, so a wrong one is noticed without
 * opening every student. Each row opens the students page searched for
 * that child, where the drawer lists their parent accounts.
 */
export function NewParentLinks({ links }: { links: RecentLink[] }) {
  if (links.length === 0) {
    return (
      <EmptyState
        icon={UserPlus}
        title="No new parent links"
        description={`Parents who link a child in the last ${NEW_LINKS_DAYS} days show up here.`}
      />
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {links.map(({ linkId, linkedAt, parent, student }) => {
        const childName = `${student.firstName} ${student.lastName}`;
        return (
          <li key={linkId} className="py-1.5 first:pt-0 last:pb-0">
            <Link
              href={`/students?q=${encodeURIComponent(childName)}`}
              className="flex flex-col gap-0.5 rounded-md px-2 py-2 transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <span className="text-foreground">
                <span className="font-medium">
                  {parent.firstName} {parent.lastName}
                </span>{" "}
                linked <span className="font-medium">{childName}</span>
              </span>
              <span className="text-sm text-muted-foreground">
                {formatSchoolDate(linkedAt)}, {formatSchoolTime(linkedAt)}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
