"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getThemePreset } from "@/lib/theme/presets";
import { NOTIFICATION_PREFERENCE_LABEL } from "./notification-settings-form";
import { SchoolLogo } from "./school-logo";
import type { School, SchoolRow } from "./types";
import { useOpenSchool } from "./use-open-school";

function ThemeCell({ school }: { school: School }) {
  if (school.theme.kind === "custom") {
    return (
      <span className="flex items-center gap-2">
        {/* The dot color comes from the school record (theme data), not a
            hardcoded literal — check:tokens only forbids literals in
            components. */}
        <span
          aria-hidden="true"
          className="size-3.5 shrink-0 rounded-full border border-border"
          style={{ backgroundColor: school.theme.brandColor }}
        />
        Custom
      </span>
    );
  }

  const preset = getThemePreset(school.theme.presetId);
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden="true" className="flex items-center gap-1">
        <span
          className="size-3.5 shrink-0 rounded-full border border-border"
          style={{ backgroundColor: preset.light.primary }}
        />
        <span
          className="size-3.5 shrink-0 rounded-full border border-border"
          style={{ backgroundColor: preset.dark.primary }}
        />
      </span>
      {preset.name}
    </span>
  );
}

function OpenSchoolButton({ schoolId }: { schoolId: string }) {
  const { isPending, open } = useOpenSchool(schoolId);

  return (
    <Button variant="outline" size="sm" disabled={isPending} onClick={open}>
      {isPending ? (
        <>
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          Opening…
        </>
      ) : (
        "Open"
      )}
    </Button>
  );
}

/**
 * The Step 25 schools list (super admin only), from 768px up; phones get
 * `SchoolsCardList` instead (Step 27.8). Between 768px and a wide screen
 * the table still scrolls inside its own container if it has to, so every
 * column stays reachable without the page itself scrolling sideways.
 */
export function SchoolsTable({ items }: { items: SchoolRow[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table label="Schools">
        <TableHeader>
          <TableRow>
            <TableHead>School</TableHead>
            <TableHead className="text-right">Students</TableHead>
            <TableHead className="text-right">Staff</TableHead>
            <TableHead>Theme</TableHead>
            <TableHead>Notifications</TableHead>
            <TableHead className="text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(({ school, studentCount, staffCount }) => (
            <TableRow key={school.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <SchoolLogo name={school.name} logoUrl={school.logoUrl} className="size-9" />
                  <p className="min-w-40 font-medium text-foreground">{school.name}</p>
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">{studentCount}</TableCell>
              <TableCell className="text-right tabular-nums">{staffCount}</TableCell>
              <TableCell className="whitespace-nowrap">
                <ThemeCell school={school} />
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {NOTIFICATION_PREFERENCE_LABEL[school.notificationPreference]}
              </TableCell>
              <TableCell className="text-right">
                <OpenSchoolButton schoolId={school.id} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
