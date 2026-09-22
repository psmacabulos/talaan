import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StaffStatusBadge } from "./staff-status-badge";
import type { Staff } from "./types";

const ROLE_LABEL: Record<Staff["role"], string> = {
  super_admin: "Super admin",
  principal: "Principal",
  teacher: "Teacher",
};

function initials(staff: Staff): string {
  return `${staff.firstName[0]}${staff.lastName[0]}`.toUpperCase();
}

/** This school's staff — principals and teachers who can sign in to it. Read-only: no row click, nothing to edit yet (Step 18 only builds the invite flow). */
export function StaffTable({ items }: { items: Staff[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Advisory class</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((staff) => (
            <TableRow key={staff.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                    {initials(staff)}
                  </span>
                  <div>
                    <p className="font-medium text-foreground">
                      {staff.firstName} {staff.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">{staff.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{ROLE_LABEL[staff.role]}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {staff.advisoryGradeLevel && staff.advisorySection
                  ? `Grade ${staff.advisoryGradeLevel} – ${staff.advisorySection}`
                  : "—"}
              </TableCell>
              <TableCell>
                <StaffStatusBadge status={staff.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
