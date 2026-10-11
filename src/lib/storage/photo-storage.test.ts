import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createLocalPhotoStorage } from "./local-photo-storage";
import { getPhotoStorage } from "./photo-storage";
import { createS3PhotoStorage } from "./s3-photo-storage";

const KEY = "school-a/student-1/abc123.webp";
const BYTES = new Uint8Array([1, 2, 3]);

describe("local photo storage", () => {
  let root: string;
  afterEach(async () => {
    if (root) await rm(root, { recursive: true, force: true });
  });

  it("stores, reads back and deletes a photo", async () => {
    root = await mkdtemp(path.join(tmpdir(), "talaan-photos-"));
    const storage = createLocalPhotoStorage(root);
    await storage.put(KEY, BYTES, "image/webp");
    await expect(storage.get(KEY)).resolves.toEqual({ bytes: BYTES, contentType: "image/webp" });
    await storage.delete(KEY);
    await expect(storage.get(KEY)).resolves.toBeNull();
    await expect(storage.delete(KEY)).resolves.toBeUndefined();
  });

  it("refuses a key that would step outside its folder", async () => {
    root = await mkdtemp(path.join(tmpdir(), "talaan-photos-"));
    const storage = createLocalPhotoStorage(root);
    await expect(storage.put("../escape.webp", BYTES, "image/webp")).rejects.toThrow("Not a valid photo key");
    await expect(storage.get("school-a/../../x.webp")).rejects.toThrow("Not a valid photo key");
  });
});

describe("S3-compatible photo storage", () => {
  const settings = {
    endpoint: "https://account.r2.cloudflarestorage.com/",
    bucket: "talaan-photos",
    accessKeyId: "test-key",
    secretAccessKey: "test-secret",
  };

  it("sends a signed PUT, GET and DELETE to <endpoint>/<bucket>/<key>, with no network", async () => {
    const requests: Request[] = [];
    const fakeFetch = (async (input: Request) => {
      requests.push(input);
      if (input.method === "GET")
        return new Response(new Uint8Array([9]), { headers: { "content-type": "image/webp" } });
      return new Response(null, { status: 200 });
    }) as typeof fetch;
    const storage = createS3PhotoStorage(settings, fakeFetch);

    await storage.put(KEY, BYTES, "image/webp");
    await expect(storage.get(KEY)).resolves.toEqual({ bytes: new Uint8Array([9]), contentType: "image/webp" });
    await storage.delete(KEY);

    expect(requests.map((request) => request.method)).toEqual(["PUT", "GET", "DELETE"]);
    for (const request of requests) {
      expect(request.url).toBe(`https://account.r2.cloudflarestorage.com/talaan-photos/${KEY}`);
      expect(request.headers.get("authorization")).toMatch(/^AWS4-HMAC-SHA256 Credential=test-key\//);
    }
  });

  it("answers null for a photo that isn't there", async () => {
    const storage = createS3PhotoStorage(settings, (async () => new Response(null, { status: 404 })) as typeof fetch);
    await expect(storage.get(KEY)).resolves.toBeNull();
  });
});

describe("getPhotoStorage", () => {
  it("uses the local folder unless told otherwise", () => {
    expect(() => getPhotoStorage({ NODE_ENV: "test" })).not.toThrow();
  });

  it("names every missing S3 setting", () => {
    expect(() => getPhotoStorage({ NODE_ENV: "test", PHOTO_STORAGE: "s3", S3_BUCKET: "b" })).toThrow(
      'PHOTO_STORAGE="s3" needs S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY',
    );
  });

  it("refuses an unknown kind of storage", () => {
    expect(() => getPhotoStorage({ NODE_ENV: "test", PHOTO_STORAGE: "ftp" })).toThrow('"local" or "s3"');
  });
});
