import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { STUDENTS_PAGE_SIZE, studentListHref, type StudentListParams } from "./search-params";

export function StudentsPagination({ params, total }: { params: StudentListParams; total: number }) {
  const pageCount = Math.max(1, Math.ceil(total / STUDENTS_PAGE_SIZE));
  const start = total === 0 ? 0 : (params.page - 1) * STUDENTS_PAGE_SIZE + 1;
  const end = Math.min(params.page * STUDENTS_PAGE_SIZE, total);
  const hasPrevious = params.page > 1;
  const hasNext = params.page < pageCount;

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-sm text-muted-foreground">
        Showing {start}&ndash;{end} of {total} student{total === 1 ? "" : "s"}
      </p>
      <div className="flex items-center gap-2">
        <PageLink direction="previous" enabled={hasPrevious} params={params} />
        <span className="text-sm text-muted-foreground">
          Page {params.page} of {pageCount}
        </span>
        <PageLink direction="next" enabled={hasNext} params={params} />
      </div>
    </div>
  );
}

function PageLink({
  direction,
  enabled,
  params,
}: {
  direction: "previous" | "next";
  enabled: boolean;
  params: StudentListParams;
}) {
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight;
  const label = direction === "previous" ? "Previous page" : "Next page";
  const className = cn(
    "flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors",
    enabled ? "hover:bg-accent hover:text-accent-foreground" : "pointer-events-none opacity-40",
  );

  if (!enabled) {
    return (
      <span className={className} aria-hidden="true">
        <Icon className="size-4" />
      </span>
    );
  }

  return (
    <Link
      href={studentListHref(params, { page: direction === "previous" ? params.page - 1 : params.page + 1 })}
      className={className}
      aria-label={label}
    >
      <Icon className="size-4" aria-hidden="true" />
    </Link>
  );
}
