import type { Staff } from "@/features/staff/types";
import { nameAt } from "./names";
import { SECTION_SLOTS } from "./students";
import { seedSchools } from "./schools";

/**
 * 7 staff total: one global super admin, plus one principal and one teacher
 * per school (3 schools × 2 = 6). Each teacher's advisory class is a real
 * section from students.ts's SECTION_SLOTS, not a made-up one.
 */
export const seedStaff: Staff[] = [
  {
    id: "staff-0001",
    schoolId: null,
    role: "super_admin",
    ...nameAt(0),
    email: "admin@talaan.example",
    status: "active",
  },
  ...seedSchools.flatMap((school, schoolIndex) => {
    const principal: Staff = {
      id: `staff-principal-${school.id}`,
      schoolId: school.id,
      role: "principal",
      ...nameAt(schoolIndex * 2 + 1),
      email: `principal@${school.id}.talaan.example`,
      status: "active",
    };

    const advisorySlot = SECTION_SLOTS.find((slot) => slot.schoolId === school.id);
    const teacher: Staff = {
      id: `staff-teacher-${school.id}`,
      schoolId: school.id,
      role: "teacher",
      ...nameAt(schoolIndex * 2 + 2),
      email: `teacher@${school.id}.talaan.example`,
      status: schoolIndex === 2 ? "invited" : "active",
      advisoryGradeLevel: advisorySlot?.gradeLevel,
      advisorySection: advisorySlot?.section,
    };

    return [principal, teacher];
  }),
];
