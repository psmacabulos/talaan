import type { z } from "zod";
import type { cardSchema, cardStatusSchema, gradeLevelSchema, studentSchema } from "./schemas";

export type GradeLevel = z.infer<typeof gradeLevelSchema>;
export type Student = z.infer<typeof studentSchema>;
export type CardStatus = z.infer<typeof cardStatusSchema>;
export type Card = z.infer<typeof cardSchema>;
