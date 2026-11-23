import Link from "next/link";
import { History } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { formatSchoolDate, formatSchoolTime } from "@/lib/school-time";
import type { ActivityPage, ActivityRow } from "@/services/audit/list-activity";
import { changedFieldsText, roleLabel, verbFor } from "./describe";
import { AUDIT_GROUPS, type AuditGroupId } from "./groups";
import { activityHref } from "./search-params";

/** One line of the log: who, what, to whom, and when. Never what a value was changed to. */
function ActivityItem({ row }: { row: ActivityRow }) {
  const changed = changedFieldsText(row.details?.fields);
  return (
    <li className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p className="text-sm text-foreground wrap-break-word">
          <span className="font-medium">{row.actorName}</span>{" "}
          <span className="text-muted-foreground">({roleLabel(row.actorRole)})</span> {verbFor(row.action)}
          {row.targetName ? (
            <>
              {" "}
              <span className="font-medium">{row.targetName}</span>
            </>
          ) : null}
          .
        </p>
        {changed ? <p className="text-sm text-muted-foreground">Changed: {changed}</p> : null}
      </div>
      <time dateTime={row.createdAt} className="shrink-0 text-sm whitespace-nowrap text-muted-foreground">
        {formatSchoolDate(row.createdAt)}, {formatSchoolTime(row.createdAt)}
      </time>
    </li>
  );
}

function FilterChips({ group }: { group: AuditGroupId | "all" }) {
  const chips = [{ id: "all" as const, label: "Everything" }, ...AUDIT_GROUPS];
  return (
    <nav aria-label="Filter activity" className="flex flex-wrap gap-2">
      {chips.map((chip) => {
        const current = chip.id === group;
        return (
          <Link
            key={chip.id}
            href={activityHref({ group: chip.id })}
            aria-current={current ? "page" : undefined}
            className={
              current
                ? "inline-flex min-h-9 items-center rounded-full bg-primary px-3.5 text-sm font-medium text-primary-foreground"
                : "inline-flex min-h-9 items-center rounded-full border border-border bg-card px-3.5 text-sm text-foreground hover:bg-muted"
            }
          >
            {chip.label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * The principal's Activity page (Step 60.1): a filter, then the log, newest
 * first, with "Older activity" for the next page. One list at every width,
 * since each line is a sentence and a time that stack on a phone and sit
 * side by side from 640px.
 */
export function ActivityList({
  page,
  group,
  isFirstPage,
}: {
  page: ActivityPage;
  group: AuditGroupId | "all";
  isFirstPage: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <FilterChips group={group} />
      {page.rows.length === 0 ? (
        <EmptyState
          icon={History}
          title={isFirstPage ? "Nothing here yet" : "No older activity"}
          description={
            isFirstPage
              ? "When staff add or change students, ID cards, staff or parent access, it shows up here."
              : "That was the oldest of what's kept."
          }
        />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card" aria-label="Activity">
          {page.rows.map((row) => (
            <ActivityItem key={row.id} row={row} />
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        {isFirstPage ? null : (
          <Link href={activityHref({ group })} className="font-medium text-primary underline-offset-4 hover:underline">
            Back to newest
          </Link>
        )}
        {page.next ? (
          <Link
            href={activityHref({ group, before: page.next })}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Older activity
          </Link>
        ) : null}
      </div>
    </div>
  );
}
