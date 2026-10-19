import {
  parentStudentLinkRepository,
  parentTokenRepository,
  type ParentStudentLinkRepository,
} from "@/data/repositories";
import { getSession } from "@/lib/session";
import { schoolOfPhotoKey, studentOfPhotoKey } from "@/features/students/photo";
import { monitorDeviceFromCookie } from "@/features/gate/monitor-viewer";
import { authenticateDevice } from "@/services/devices/authenticate-device";
import { readBearerToken } from "@/services/devices/device-token";
import { authenticateParent, PARENT_TOKEN_PREFIX, type ParentTokenDeps } from "@/services/parents/parent-token";

/**
 * Who is asking for a photo: one school's screen, a super admin who can see
 * every school, or a parent, who sees only their own linked children.
 */
export type PhotoViewer =
  { schoolId: string } | { allSchools: true } | { children: { schoolId: string; studentId: string }[] };

/**
 * A photo is shown only to its own school's staff, gate or monitor, to a
 * super admin, or to a parent of that student (Step 53.4), whichever photo
 * of theirs it is.
 */
export function canViewPhoto(key: string, viewer: PhotoViewer | null): boolean {
  if (!viewer) return false;
  if ("allSchools" in viewer) return true;
  if ("children" in viewer) {
    return viewer.children.some(
      (child) => child.schoolId === schoolOfPhotoKey(key) && child.studentId === studentOfPhotoKey(key),
    );
  }
  return schoolOfPhotoKey(key) === viewer.schoolId;
}

/** The parent behind a `tal_par_` token, with their linked children, each at the school the link saved. */
export async function parentPhotoViewer(
  authorization: string,
  now: string,
  deps: ParentTokenDeps & { links: Pick<ParentStudentLinkRepository, "listByParent"> },
): Promise<PhotoViewer | null> {
  const caller = await authenticateParent(authorization, now, deps);
  if (!caller) return null;
  const links = await deps.links.listByParent(caller.parentId);
  return { children: links.map(({ schoolId, studentId }) => ({ schoolId, studentId })) };
}

/**
 * The viewer behind a photo request: the parent app by its `tal_par_` token
 * (Step 53.4), a gate or monitor by its Bearer token (the gate fetches
 * photos into its own cache, Step 47), then a guardhouse TV's cookie
 * (Step 48), otherwise the signed-in staff session (Step 50).
 */
export async function resolvePhotoViewer(authorization: string | null): Promise<PhotoViewer | null> {
  if (authorization) {
    if (readBearerToken(authorization)?.startsWith(PARENT_TOKEN_PREFIX)) {
      // The real clock, never DEMO_NOW: a token's 30 days are real days.
      return parentPhotoViewer(authorization, new Date().toISOString(), {
        tokens: parentTokenRepository,
        links: parentStudentLinkRepository,
      });
    }
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
