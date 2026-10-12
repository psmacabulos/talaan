import { describe, expect, it } from "vitest";
import { readPhotoUpload } from "./photo-changes";

const WEBP_HEADER = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];

function formWith(bytes: number[]): FormData {
  const form = new FormData();
  form.set("photo", new File([new Uint8Array(bytes)], "photo"));
  return form;
}

describe("readPhotoUpload", () => {
  it("is no photo when none was sent", async () => {
    expect(await readPhotoUpload(undefined)).toEqual({ ok: true, photo: null });
    expect(await readPhotoUpload(new FormData())).toEqual({ ok: true, photo: null });
  });

  it("reads a WebP thumbnail by its own first bytes", async () => {
    const result = await readPhotoUpload(formWith([...WEBP_HEADER, 1, 2, 3]));
    expect(result.ok && result.photo?.type).toBe("webp");
  });

  it("refuses a file that isn't a WebP or JPEG", async () => {
    expect(await readPhotoUpload(formWith([0x47, 0x49, 0x46, 0x38]))).toEqual({
      ok: false,
      message: "That photo couldn't be used. Try another one.",
    });
  });
});
