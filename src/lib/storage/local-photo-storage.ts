import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PhotoStorage } from "./photo-storage";

/** A key is plain path parts: letters, digits, dashes and dots, never "..". */
function assertSafeKey(key: string): void {
  const parts = key.split("/");
  if (parts.some((part) => part === "" || part === "." || part === ".." || !/^[\w.-]+$/.test(part))) {
    throw new Error(`Not a valid photo key: "${key}".`);
  }
}

/**
 * Development's stand-in for R2: files under `.data/photos/<key>` (ignored
 * by git), with each one's content type in a small `<key>.type` file.
 */
export function createLocalPhotoStorage(root = path.join(process.cwd(), ".data", "photos")): PhotoStorage {
  const fileFor = (key: string) => {
    assertSafeKey(key);
    return path.join(root, ...key.split("/"));
  };

  return {
    async put(key, bytes, contentType) {
      const file = fileFor(key);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, bytes);
      await writeFile(`${file}.type`, contentType);
    },
    async get(key) {
      const file = fileFor(key);
      try {
        const [bytes, contentType] = await Promise.all([readFile(file), readFile(`${file}.type`, "utf8")]);
        return { bytes: new Uint8Array(bytes), contentType };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw error;
      }
    },
    async delete(key) {
      const file = fileFor(key);
      await Promise.all([rm(file, { force: true }), rm(`${file}.type`, { force: true })]);
    },
  };
}
