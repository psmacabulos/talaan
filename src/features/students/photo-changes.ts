import { detectPhotoType, MAX_PHOTO_BYTES, type PhotoType } from "./photo";

/**
 * Reads the photo the student form sent with Save (Step 46.5, saved with
 * the form since 2026-10-12). The browser has already cropped and shrunk it
 * to a 256×256 thumbnail; this checks that's really what arrived: its size,
 * and the file's own first bytes, not the type the browser claims.
 */
export async function readPhotoUpload(
  formData: FormData | undefined,
): Promise<{ ok: true; photo: { bytes: Uint8Array; type: PhotoType } | null } | { ok: false; message: string }> {
  const file = formData instanceof FormData ? formData.get("photo") : null;
  if (file === null) return { ok: true, photo: null };

  const unusable = { ok: false as const, message: "That photo couldn't be used. Try another one." };
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_PHOTO_BYTES) return unusable;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectPhotoType(bytes);
  return type ? { ok: true, photo: { bytes, type } } : unusable;
}
