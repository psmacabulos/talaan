"use client";

import { Fragment, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Role, Staff } from "@/features/staff/types";
import type { School } from "@/features/schools/types";
import { setDevSession } from "@/lib/session-actions";
import { clearThemeOverride } from "@/lib/theme/theme-override-actions";

const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super admin",
  principal: "Principal",
  teacher: "Teacher",
};

function personaLabel(member: Staff): string {
  const base = `${ROLE_LABEL[member.role]}, ${member.firstName} ${member.lastName}`;
  return member.status === "invited" ? `${base} (invited)` : base;
}

/**
 * Replaces the plain "Principal, Balanga City NSHS" text Step 10 built
 * with the same text as a button that opens a "view as" menu — a
 * stand-in for real login (Phase 2), never rendered in production (see
 * topbar.tsx, which only imports this component when
 * `NODE_ENV !== "production"`).
 */
export function DevSwitcher({
  userId,
  role,
  school,
  staff,
  schools,
}: {
  userId: string;
  role: Role;
  school: School | null;
  staff: Staff[];
  schools: School[];
}) {
  const [isPending, startTransition] = useTransition();

  function switchTo(staffId: string) {
    startTransition(async () => {
      await setDevSession(staffId);
      await clearThemeOverride();
    });
  }

  const platform = staff.filter((member) => member.schoolId === null);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          disabled={isPending}
          className="h-auto max-w-64 justify-start gap-1.5 px-2 py-1.5 text-sm font-normal text-muted-foreground hover:text-foreground"
        >
          <span className="truncate">
            {ROLE_LABEL[role]}
            {school ? `, ${school.name}` : ""}
          </span>
          <ChevronDown className="size-3.5 shrink-0" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Preview as (dev only)
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={userId} onValueChange={switchTo}>
          {platform.length > 0 && (
            <Fragment>
              <DropdownMenuLabel>Platform</DropdownMenuLabel>
              {platform.map((member) => (
                <DropdownMenuRadioItem key={member.id} value={member.id}>
                  {personaLabel(member)}
                </DropdownMenuRadioItem>
              ))}
            </Fragment>
          )}
          {schools.map((s) => {
            const schoolStaff = staff.filter((member) => member.schoolId === s.id);
            if (schoolStaff.length === 0) return null;
            return (
              <Fragment key={s.id}>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>{s.name}</DropdownMenuLabel>
                {schoolStaff.map((member) => (
                  <DropdownMenuRadioItem key={member.id} value={member.id}>
                    {personaLabel(member)}
                  </DropdownMenuRadioItem>
                ))}
              </Fragment>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
