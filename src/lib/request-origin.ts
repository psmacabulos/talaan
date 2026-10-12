import { headers } from "next/headers";

/**
 * This site's own address ("https://talaan.example"), from the request
 * being answered, so links like Step 50.5's set-password link never
 * hard-code it. A Server Action call from a browser carries `Origin`.
 * Otherwise, behind a router like Heroku's, the original scheme and host
 * arrive as `x-forwarded-proto` and `x-forwarded-host`.
 */
export async function requestOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim() || (process.env.NODE_ENV === "production" ? "https" : "http");
  return `${proto}://${host}`;
}
