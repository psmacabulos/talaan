"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { CardFilter, StudentListParams } from "./search-params";
import { studentListHref } from "./search-params";
import type { GradeLevel } from "./types";

const GRADE_LEVELS: readonly GradeLevel[] = [7, 8, 9, 10, 11, 12];

// On phones the filters share one row at full, thumb-sized height; from
// 640px up they sit inline at their normal size.
const FILTER_TRIGGER_CLASS = "w-full data-[size=default]:h-11 sm:w-fit sm:data-[size=default]:h-8";

const CARD_FILTER_LABEL: Record<CardFilter, string> = {
  all: "All cards",
  active: "Linked",
  none: "No card",
  lost: "Lost",
};

/**
 * Search debounces (so every keystroke doesn't spam browser history) and
 * navigates with `router.replace`; the grade and card selects change
 * infrequently, so each one is its own real back-button stop via
 * `router.push`. Grade filtering is hidden entirely for teachers — they're
 * already scoped to one grade and section server-side.
 */
export function StudentsToolbar({
  params,
  showGradeFilter,
}: {
  params: StudentListParams;
  showGradeFilter: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(params.q);
  // Adjusting state during render (React's documented pattern for "reset
  // state when a prop changes") rather than an Effect, so the search box
  // stays in sync when the URL changes from elsewhere — the back button, a
  // sort-header link — without an extra render each time.
  const [syncedQuery, setSyncedQuery] = useState(params.q);
  if (params.q !== syncedQuery) {
    setSyncedQuery(params.q);
    setQuery(params.q);
  }

  useEffect(() => {
    if (query === params.q) return;
    const timeout = setTimeout(() => {
      router.replace(studentListHref(params, { q: query, page: 1 }));
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div
      className={cn(
        "grid gap-3 sm:flex sm:flex-wrap sm:items-center",
        showGradeFilter ? "grid-cols-2" : "grid-cols-1",
      )}
    >
      <div className="relative col-span-full sm:w-72">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or LRN"
          aria-label="Search students by name or LRN"
          className="h-11 pl-8 sm:h-8"
        />
      </div>

      {showGradeFilter ? (
        <Select
          value={String(params.grade)}
          onValueChange={(value) =>
            router.push(
              studentListHref(params, { grade: value === "all" ? "all" : (Number(value) as GradeLevel), page: 1 }),
            )
          }
        >
          <SelectTrigger aria-label="Filter by grade" className={FILTER_TRIGGER_CLASS}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All grades</SelectItem>
            {GRADE_LEVELS.map((grade) => (
              <SelectItem key={grade} value={String(grade)}>
                Grade {grade}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      <Select
        value={params.card}
        onValueChange={(value) => router.push(studentListHref(params, { card: value as CardFilter, page: 1 }))}
      >
        <SelectTrigger aria-label="Filter by card status" className={FILTER_TRIGGER_CLASS}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(CARD_FILTER_LABEL) as CardFilter[]).map((value) => (
            <SelectItem key={value} value={value}>
              {CARD_FILTER_LABEL[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
