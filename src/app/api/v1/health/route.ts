import { prisma } from "@/lib/db";

/**
 * "Is the site up, and can it reach its database?" (Step 52). For a person
 * checking a deploy, and later a free uptime monitor. Needs no sign-in and
 * says nothing about any school.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ ok: true, database: "ok" });
  } catch {
    return Response.json({ ok: false, database: "unreachable" }, { status: 503 });
  }
}
