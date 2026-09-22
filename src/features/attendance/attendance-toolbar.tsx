"use client";

import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { GradeLevel } from "@/features/students/types";
import { attendanceHref, type ClassOption } from "./attendance-search-params";

/**
 * Date, grade and section — each its own real back-button stop
 * (`router.push`, same as the Students list's grade/card selects), since
 * picking a different class or day is a deliberate choice, not the kind of
 * per-keystroke change that would want `replace`.
 *
 * `showClassPicker` is false for a teacher: they only have one class, so the
 * grade/section selects are hidden entirely rather than shown-but-disabled
 * (same precedent as `StudentsToolbar`'s `showGradeFilter`) — the real
 * restriction is enforced server-side in `resolveClassSelection`'s
 * `lockedTo`, this is just not showing controls that couldn't do anything.
 */
export function AttendanceToolbar({
  date,
  selected,
  options,
  showClassPicker,
}: {
  date: string;
  selected: ClassOption;
  options: ClassOption[];
  showClassPicker: boolean;
}) {
  const router = useRouter();
  const gradeLevels = [...new Set(options.map((option) => option.gradeLevel))].sort((a, b) => a - b);
  const sectionsForGrade = options.filter((option) => option.gradeLevel === selected.gradeLevel);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-foreground">Date</span>
        <Input
          type="date"
          value={date}
          onChange={(event) =>
            router.push(
              attendanceHref({ date: event.target.value, gradeLevel: selected.gradeLevel, section: selected.section }),
            )
          }
          className="sm:w-44"
          aria-label="Attendance date"
        />
      </label>

      {showClassPicker ? (
        <>
          <div className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Grade</span>
            <Select
              value={String(selected.gradeLevel)}
              onValueChange={(value) => {
                const gradeLevel = Number(value) as GradeLevel;
                const firstSection =
                  options.find((option) => option.gradeLevel === gradeLevel)?.section ?? selected.section;
                router.push(attendanceHref({ date, gradeLevel, section: firstSection }));
              }}
            >
              <SelectTrigger aria-label="Filter by grade" className="sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {gradeLevels.map((gradeLevel) => (
                  <SelectItem key={gradeLevel} value={String(gradeLevel)}>
                    Grade {gradeLevel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-foreground">Section</span>
            <Select
              value={selected.section}
              onValueChange={(section) =>
                router.push(attendanceHref({ date, gradeLevel: selected.gradeLevel, section }))
              }
            >
              <SelectTrigger aria-label="Filter by section" className="sm:w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sectionsForGrade.map((option) => (
                  <SelectItem key={option.section} value={option.section}>
                    {option.section}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      ) : null}
    </div>
  );
}
