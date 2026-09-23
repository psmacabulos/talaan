import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ROLE_LABEL, StaffAvatar, advisoryLabel, staffName } from "./staff-display";
import { StaffRowMenu } from "./staff-row-menu";
import { StaffStatusBadge } from "./staff-status-badge";
import type { Staff } from "./types";

/**
 * This school's staff on screens 768px and wider — built for scanning many
 * rows at once. Below that, `StaffCompactList` shows the same records as
 * compact rows instead (Step 27.6). The last column holds each row's ⋮ menu.
 */
export function StaffTable({ items, currentUserId }: { items: Staff[]; currentUserId: string }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table label="Staff">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Advisory class</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-12">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((staff) => (
            <TableRow key={staff.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <StaffAvatar staff={staff} />
                  <div>
                    <p className="font-medium text-foreground">{staffName(staff)}</p>
                    <p className="text-sm text-muted-foreground">{staff.email}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{ROLE_LABEL[staff.role]}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{advisoryLabel(staff) ?? "—"}</TableCell>
              <TableCell>
                <StaffStatusBadge status={staff.status} />
              </TableCell>
              <TableCell className="text-right">
                <StaffRowMenu staff={staff} currentUserId={currentUserId} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
