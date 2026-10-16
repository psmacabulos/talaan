import type { ZodError } from "zod";

/** Each field's first message, the shape every form shows under its inputs. */
export function firstFieldErrors<Shape extends Record<string, unknown>>(
  error: ZodError<Shape>,
): Partial<Record<keyof Shape, string>> {
  const flattened = error.flatten().fieldErrors;
  const fieldErrors: Partial<Record<keyof Shape, string>> = {};
  for (const key of Object.keys(flattened) as (keyof Shape)[]) {
    const [firstMessage] = flattened[key] ?? [];
    if (firstMessage) fieldErrors[key] = firstMessage;
  }
  return fieldErrors;
}
