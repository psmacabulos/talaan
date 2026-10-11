import { describe, expect, it } from "vitest";
import { detectPhotoType, newPhotoKey, photoPath, schoolOfPhotoKey } from "./photo";
import { studentSchema } from "./schemas";

describe("newPhotoKey", () => {
  it("starts with the school, ends with the type, and is new every time", () => {
    const first = newPhotoKey("school-balanga", "student-0001", "webp");
    expect(first).toMatch(/^school-balanga\/student-0001\/[0-9a-f]{12}\.webp$/);
    expect(newPhotoKey("school-balanga", "student-0001", "webp")).not.toBe(first);
    expect(schoolOfPhotoKey(first)).toBe("school-balanga");
    expect(studentSchema.shape.photoKey.safeParse(first).success).toBe(true);
  });

  it("is loaded from the photo route", () => {
    expect(photoPath("school-a/s1/abc.webp")).toBe("/api/v1/photos/school-a/s1/abc.webp");
  });
});

describe("detectPhotoType", () => {
  const ascii = (text: string) => Array.from(text, (char) => char.charCodeAt(0));

  it("recognises WebP and JPEG by their first bytes", () => {
    expect(detectPhotoType(new Uint8Array([...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBP"), 0]))).toBe("webp");
    expect(detectPhotoType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpeg");
  });

  it("rejects anything else, whatever it claims to be", () => {
    expect(detectPhotoType(new Uint8Array([0x89, ...ascii("PNG"), 0, 0, 0, 0, 0, 0, 0, 0]))).toBeNull();
    expect(detectPhotoType(new Uint8Array(ascii("<svg>")))).toBeNull();
    expect(detectPhotoType(new Uint8Array([0xff, 0xd8]))).toBeNull();
  });
});
