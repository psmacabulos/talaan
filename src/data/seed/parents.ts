import type { Parent } from "@/features/parents/types";
import { nameAt } from "./names";

/**
 * A handful of parent accounts across the three schools, each linked (via
 * parent-student-links.ts) to one or more existing seed students so Steps
 * 22-24 have real data to render against. Names come from `nameAt()` with a
 * `+500` offset — deliberately NOT a multiple of `FIRST_NAMES.length` (40):
 * an offset divisible by 40 would land on the exact same first name as the
 * student it's paired with (the same trap the student guardian names fell
 * into, caught in docs/BUILD-LOG.md's Step 14 entry).
 */
export const seedParents: Parent[] = [
  {
    id: "parent-balanga-1",
    schoolId: "school-balanga",
    ...nameAt(500),
    mobile: "09170000001",
    email: "parent-one@balanga.example",
  },
  {
    id: "parent-balanga-2",
    schoolId: "school-balanga",
    ...nameAt(501),
    mobile: "09170000002",
    email: "parent-two@balanga.example",
  },
  {
    id: "parent-oceanview-1",
    schoolId: "school-oceanview",
    ...nameAt(502),
    mobile: "09170000003",
    email: "parent-one@oceanview.example",
  },
  {
    id: "parent-oceanview-2",
    schoolId: "school-oceanview",
    ...nameAt(503),
    mobile: "09170000004",
    email: "parent-two@oceanview.example",
  },
  {
    id: "parent-crimsonridge-1",
    schoolId: "school-crimsonridge",
    ...nameAt(504),
    mobile: "09170000005",
    email: "parent-one@crimsonridge.example",
  },
  {
    id: "parent-crimsonridge-2",
    schoolId: "school-crimsonridge",
    ...nameAt(505),
    mobile: "09170000006",
    email: "parent-two@crimsonridge.example",
  },
];
