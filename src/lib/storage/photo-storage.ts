import { createLocalPhotoStorage } from "./local-photo-storage";
import { createS3PhotoStorage } from "./s3-photo-storage";

/**
 * Where student photo thumbnails live (Step 46.5). Every caller uses this
 * interface and never knows which service is behind it, so moving from
 * Cloudflare R2 to S3, Backblaze or MinIO changes settings, not code
 * (CLAUDE.md: cheap to run, easy to move).
 */
export interface PhotoStorage {
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  /** null when there's nothing at that key. */
  get(key: string): Promise<{ bytes: Uint8Array; contentType: string } | null>;
  /** No error when the key is already gone. */
  delete(key: string): Promise<void>;
}

const S3_SETTINGS = ["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"] as const;

/** The storage PHOTO_STORAGE chooses: "local" (default, a folder) or "s3" (any S3-compatible service). */
export function getPhotoStorage(env: NodeJS.ProcessEnv = process.env): PhotoStorage {
  const kind = env.PHOTO_STORAGE ?? "local";
  if (kind === "local") return createLocalPhotoStorage();
  if (kind !== "s3") throw new Error(`PHOTO_STORAGE must be "local" or "s3", not "${kind}".`);

  const missing = S3_SETTINGS.filter((name) => !env[name]);
  if (missing.length > 0) throw new Error(`PHOTO_STORAGE="s3" needs ${missing.join(", ")} in the environment.`);
  return createS3PhotoStorage({
    endpoint: env.S3_ENDPOINT!,
    bucket: env.S3_BUCKET!,
    accessKeyId: env.S3_ACCESS_KEY_ID!,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
  });
}
