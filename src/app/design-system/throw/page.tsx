import { notFound } from "next/navigation";
import { connection } from "next/server";

/**
 * Throws on purpose, so the real error page can be seen (Step 59.1). Like
 * `/design-system`, it 404s in production; the browser tests' production
 * server (E2E=1, never set on a real server) is the one exception. Read
 * at request time, not at build, where E2E isn't set.
 */
export default async function ThrowPage() {
  await connection();
  if (process.env.NODE_ENV === "production" && process.env.E2E !== "1") {
    notFound();
  }
  throw new Error("A deliberate error, to show the error page");
}
