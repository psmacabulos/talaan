import type { Student } from "./types";

/**
 * Everything the school keeps about one student that is theirs (Step 60.3),
 * as the download's body. Never another student's, never a parent's email or
 * mobile, never which gate read a tap or which staff member did what.
 */
export type StudentExport = {
  student: Student;
  addedAt: string;
  cards: { serial: string; status: string; linkedAt: string }[];
  /** `lostCard`: a tap of one of their cards after it was reported lost, which counts as nobody's attendance. */
  taps: { tappedAt: string; source: "card" | "manual"; lostCard: boolean }[];
  alerts: { type: string; createdAt: string; acknowledged: boolean }[];
  /** The time-in and time-out notices sent to guardians; not the notices about a parent linking. */
  notices: { kind: string; tappedAt: string; read: boolean }[];
  linkedParents: { firstName: string; lastName: string; linkedAt: string }[];
};

/** The file the principal downloads: the export, the photo as a data URL, and when and by what it was made. */
export type StudentExportFile = StudentExport & { photo: string | null; exportedAt: string; format: 1 };
