import { afterEach, describe, expect, it, vi } from "vitest";
import type { PhotoViewer } from "@/services/photos/photo-viewer";

// The two viewers are faked: who the request is from is decided by
// `resolvePhotoViewer` (token, monitor cookie, staff session) and, on the
// web, `webParentPhotoViewer` (the parent cookie, Step 59.5). The check
// itself, `canViewPhoto`, is the real one.
const viewers = vi.hoisted(() => ({
  usual: vi.fn<(authorization: string | null) => Promise<PhotoViewer | null>>(),
  webParent: vi.fn<() => Promise<PhotoViewer | null>>(),
}));
vi.mock("@/services/photos/photo-viewer", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/photos/photo-viewer")>()),
  resolvePhotoViewer: (authorization: string | null) => viewers.usual(authorization),
  webParentPhotoViewer: () => viewers.webParent(),
}));
vi.mock("@/lib/storage/photo-storage", () => ({
  getPhotoStorage: () => ({
    get: async () => ({ bytes: new Uint8Array([0xff, 0xd8, 0xff]), contentType: "image/jpeg" }),
  }),
}));

const { GET } = await import("./route");

const KEY = "school-oceanview/student-0037/8fd4367ed14d.jpeg";
const PARENT_OF_KATRINA: PhotoViewer = { children: [{ schoolId: "school-oceanview", studentId: "student-0037" }] };

function ask(key: string, headers: Record<string, string> = {}) {
  return GET(new Request(`http://localhost:3000/api/v1/photos/${key}`, { headers }), {
    params: Promise.resolve({ key: key.split("/") }),
  });
}

afterEach(() => {
  viewers.usual.mockReset();
  viewers.webParent.mockReset();
});

describe("GET /api/v1/photos/…", () => {
  it("shows a parent on the web their own child's photo", async () => {
    viewers.usual.mockResolvedValue(null);
    viewers.webParent.mockResolvedValue(PARENT_OF_KATRINA);

    const response = await ask(KEY);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/jpeg");
  });

  it("is 404 for a child who isn't linked to them", async () => {
    viewers.usual.mockResolvedValue(null);
    viewers.webParent.mockResolvedValue(PARENT_OF_KATRINA);

    expect((await ask("school-oceanview/student-0038/3af5b7644147.jpeg")).status).toBe(404);
  });

  it("still shows their own child at another school when staff are signed in too", async () => {
    viewers.usual.mockResolvedValue({ schoolId: "school-balanga" });
    viewers.webParent.mockResolvedValue(PARENT_OF_KATRINA);

    expect((await ask(KEY)).status).toBe(200);
  });

  it("never reads the parent cookie for staff who may already see the photo", async () => {
    viewers.usual.mockResolvedValue({ schoolId: "school-oceanview" });

    expect((await ask(KEY)).status).toBe(200);
    expect(viewers.webParent).not.toHaveBeenCalled();
  });

  it("is 404 for a token that fails, without looking at the cookie", async () => {
    viewers.usual.mockResolvedValue(null);
    viewers.webParent.mockResolvedValue(PARENT_OF_KATRINA);

    expect((await ask(KEY, { Authorization: "Bearer tal_par_made-up" })).status).toBe(404);
    expect(viewers.usual).toHaveBeenCalledWith("Bearer tal_par_made-up");
    expect(viewers.webParent).not.toHaveBeenCalled();
  });
});
