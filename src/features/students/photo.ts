/** The two formats the drawer's resize produces: WebP, or JPEG where WebP can't be made (older Safari). */
export type PhotoType = "webp" | "jpeg";

/** A 256×320 thumbnail is about 15–20 KB; this leaves room and nothing more. */
export const MAX_PHOTO_BYTES = 100_000;

/**
 * Every stored photo is a 4:5 portrait, 256 × 320 (owner decision,
 * 2026-10-12): an ID-photo shape for the gate and the guardhouse monitor,
 * and the same file, smaller, in every list. One file, never cropped again
 * on screen.
 */
export const PHOTO_WIDTH = 256;
export const PHOTO_HEIGHT = 320;

export const PHOTO_CONTENT_TYPE: Record<PhotoType, string> = { webp: "image/webp", jpeg: "image/jpeg" };

/**
 * "school-balanga/student-0001/k3x9q2ab.webp": the school first (so access
 * can be checked from the key alone), and a new random part on every
 * upload, so a cached old face is never shown for a new photo.
 */
export function newPhotoKey(schoolId: string, studentId: string, type: PhotoType): string {
  const random = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  return `${schoolId}/${studentId}/${random}.${type}`;
}

/** The school a photo key belongs to: its first part. */
export function schoolOfPhotoKey(key: string): string {
  return key.split("/")[0];
}

/** Where a screen loads a photo from. */
export function photoPath(key: string): string {
  return `/api/v1/photos/${key}`;
}

/** The file's real type from its first bytes, never the type the browser claims: RIFF…WEBP, or FF D8 FF. */
export function detectPhotoType(bytes: Uint8Array): PhotoType | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  return null;
}
