import { studentSchema } from "@/features/students/schemas";
import { getPhotoStorage } from "@/lib/storage/photo-storage";
import { canViewPhoto, resolvePhotoViewer, webParentPhotoViewer } from "@/services/photos/photo-viewer";

const photoKeySchema = studentSchema.shape.photoKey.unwrap();

/**
 * One student's photo thumbnail (Step 46.5), for that school's staff, gate
 * or monitor, or the student's own parent, in the app (Step 53.4) or on the
 * web (Step 59.5), only.
 * Anyone else gets 404, not 403, so the address never
 * reveals whether a photo exists. A new photo always has a new key, so the
 * browser may keep this one for a year.
 */
export async function GET(request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key: parts } = await params;
  const key = parts.join("/");
  const notFound = () => new Response("Not found", { status: 404 });

  if (!photoKeySchema.safeParse(key).success) return notFound();
  const authorization = request.headers.get("authorization");
  const allowed =
    canViewPhoto(key, await resolvePhotoViewer(authorization)) ||
    // A parent on the web (Step 59.5), only once the usual viewers said no,
    // so a staff request reads nothing more. Never with a token: a token
    // that failed is the answer, whatever cookie the request also carries.
    (!authorization && canViewPhoto(key, await webParentPhotoViewer()));
  if (!allowed) return notFound();

  const photo = await getPhotoStorage().get(key);
  if (!photo) return notFound();

  return new Response(new Uint8Array(photo.bytes), {
    headers: {
      "Content-Type": photo.contentType,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
