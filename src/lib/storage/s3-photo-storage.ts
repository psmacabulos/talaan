import { AwsClient } from "aws4fetch";
import type { PhotoStorage } from "./photo-storage";

export type S3Settings = {
  /** For Cloudflare R2: https://<account-id>.r2.cloudflarestorage.com */
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

/**
 * Photos in any S3-compatible bucket (Cloudflare R2 in production). Plain
 * HTTP requests, each signed by `aws4fetch`; the bucket stays private, and
 * photos reach a screen only through `/api/v1/photos/…` (Step 46.5).
 */
export function createS3PhotoStorage(settings: S3Settings, fetchImpl: typeof fetch = fetch): PhotoStorage {
  const client = new AwsClient({
    accessKeyId: settings.accessKeyId,
    secretAccessKey: settings.secretAccessKey,
    service: "s3",
    region: "auto",
  });
  const base = `${settings.endpoint.replace(/\/+$/, "")}/${settings.bucket}`;
  const urlFor = (key: string) => `${base}/${key.split("/").map(encodeURIComponent).join("/")}`;

  async function send(method: string, key: string, init: RequestInit = {}): Promise<Response> {
    const signed = await client.sign(urlFor(key), { method, ...init });
    return fetchImpl(signed);
  }

  return {
    async put(key, bytes, contentType) {
      // A copy typed as a plain ArrayBuffer view, which is what a request body accepts.
      const body = new Uint8Array(bytes);
      const response = await send("PUT", key, { body, headers: { "Content-Type": contentType } });
      if (!response.ok) throw new Error(`Photo upload failed: ${response.status}.`);
    },
    async get(key) {
      const response = await send("GET", key);
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Photo download failed: ${response.status}.`);
      return {
        bytes: new Uint8Array(await response.arrayBuffer()),
        contentType: response.headers.get("content-type") ?? "application/octet-stream",
      };
    },
    async delete(key) {
      const response = await send("DELETE", key);
      if (!response.ok && response.status !== 404) throw new Error(`Photo delete failed: ${response.status}.`);
    },
  };
}
