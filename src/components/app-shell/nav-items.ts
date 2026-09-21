import { CalendarCheck, IdCard, LayoutDashboard, Nfc, School, Users, type LucideIcon } from "lucide-react";
import type { Role } from "@/features/staff/types";

export type NavSegment = "schools" | "dashboard" | "attendance" | "students" | "staff" | "station";

export type NavItem = {
  segment: NavSegment;
  href: `/${NavSegment}`;
  label: string;
  icon: LucideIcon;
  roles: readonly Role[];
};

const ALL_ROLES: readonly Role[] = ["super_admin", "principal", "teacher"];
const SCHOOL_STAFF_ROLES: readonly Role[] = ["super_admin", "principal"];

/**
 * The one place nav visibility and route guards both read from, so the two
 * can't drift apart — see design/school-portal-prototype.html's own NAV map
 * for the role → section list this mirrors.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { segment: "schools", href: "/schools", label: "Schools", icon: School, roles: ["super_admin"] },
  { segment: "dashboard", href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ALL_ROLES },
  { segment: "attendance", href: "/attendance", label: "Attendance", icon: CalendarCheck, roles: ALL_ROLES },
  { segment: "students", href: "/students", label: "Students", icon: Users, roles: ALL_ROLES },
  { segment: "staff", href: "/staff", label: "Staff", icon: IdCard, roles: SCHOOL_STAFF_ROLES },
  { segment: "station", href: "/station", label: "Tap station", icon: Nfc, roles: SCHOOL_STAFF_ROLES },
];

export function navItemsForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export function hasNavAccess(role: Role, segment: NavSegment): boolean {
  const item = NAV_ITEMS.find((candidate) => candidate.segment === segment);
  return item ? item.roles.includes(role) : true;
}
