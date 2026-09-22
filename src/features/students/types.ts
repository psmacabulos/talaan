import type { z } from "zod";
import type { cardSchema, cardStatusSchema, gradeLevelSchema, studentFormSchema, studentSchema } from "./schemas";

export type GradeLevel = z.infer<typeof gradeLevelSchema>;
export type Student = z.infer<typeof studentSchema>;
export type CardStatus = z.infer<typeof cardStatusSchema>;
export type Card = z.infer<typeof cardSchema>;
/**
 * `studentFormSchema` transforms a couple of fields (a blank LRN/middle
 * name becomes `undefined`), so its input and output shapes genuinely
 * differ from React Hook Form's point of view: `StudentFormValues` is what
 * the form fields themselves hold (`useForm`'s own generic); `StudentFormInput`
 * is what a validated submission — and the server actions that receive it —
 * actually works with.
 */
export type StudentFormValues = z.input<typeof studentFormSchema>;
export type StudentFormInput = z.infer<typeof studentFormSchema>;
