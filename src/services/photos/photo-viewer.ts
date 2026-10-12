import { getSession } from "@/lib/session";
import { schoolOfPhotoKey } from "@/features/students/photo";
import { monitorDeviceFromCookie } from "@/features/gate/monitor-viewer";
import { authenticateDevice } from "@/services/devices/authenticate-device";

/** Who is asking for a photo: one school's screen, or a super admin who can see every school. */
export type PhotoViewer = { schoolId: string } | { allSchools: true };

/** A photo is shown only to its own school's staff, gate or monitor, or to a super admin. */
export function canViewPhoto(key: string, viewer: PhotoViewer | null): boolean {
  if (!viewer) return false;
  if ("allSchools" in viewer) return true;
  return schoolOfPhotoKey(key) === viewer.schoolId;
}

/**
 * The viewer behind a photo request: a gate or monitor by its Bearer token
 * (the gate fetches photos into its own cache, Step 47), then a guardhouse
 * TV's cookie (Step 48), otherwise the signed-in staff session (Step 50).
 */
export async function resolvePhotoViewer(authorization: string | null): Promise<PhotoViewer | null> {
  if (authorization) {
    const device = await authenticateDevice(authorization);
    return device ? { schoolId: device.schoolId } : null;
  }
  // The guardhouse TV loads photos with its cookie, like any <img> (Step 48).
  const monitor = await monitorDeviceFromCookie();
  if (monitor) return { schoolId: monitor.schoolId };
  const session = await getSession();
  if (!session) return null;
  if (session.role === "super_admin" && !session.schoolId) return { allSchools: true };
  return session.schoolId ? { schoolId: session.schoolId } : null;
}
