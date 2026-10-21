// @vitest-environment node
import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { createPrismaStaffRepository } from "./prisma-staff-repository";
import { createPrismaStudentRepository } from "./prisma-student-repository";

/**
 * Lookups by something a person types, against real Postgres (P-028):
 * Prisma's case-insensitive `equals` is an ILIKE, where "%" and "_" are
 * wildcards, so "%" once matched any child's last name and "_dmin@…" the
 * super admin's email. Only a real database shows it. Skipped, not failed,
 * when E2E_DATABASE_URL isn't set.
 */
const url = process.env.E2E_DATABASE_URL;
const describeWithDatabase = url ? describe : describe.skip;

// Jose Pascual, Balanga's demo child, and the seed's super admin.
const JOSE = { lrn: "100000000002", birthDate: "2014-03-03" };

describeWithDatabase("lookups by typed text on Postgres (P-028; needs E2E_DATABASE_URL)", () => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  const students = createPrismaStudentRepository(db);
  const staff = createPrismaStaffRepository(db);

  afterAll(() => db.$disconnect());

  it("matches a child's last name whatever its case or spaces, and never by wildcard", async () => {
    for (const lastName of ["Pascual", "pascual", " PASCUAL "]) {
      await expect(students.findForLink("school-balanga", { ...JOSE, lastName })).resolves.toMatchObject({
        id: "student-0003",
      });
    }
    for (const lastName of ["%", "P%", "_ascual", "Pascua_", "%ascual%"]) {
      await expect(students.findForLink("school-balanga", { ...JOSE, lastName })).resolves.toBeNull();
    }
  });

  it("finds a staff member by their email whatever its case, and never by wildcard", async () => {
    await expect(staff.findByEmail(" Admin@Talaan.Example ")).resolves.toMatchObject({ id: "staff-0001" });
    for (const email of ["_dmin@talaan.example", "%@talaan.example", "admin@talaan.exampl_"]) {
      await expect(staff.findByEmail(email)).resolves.toBeNull();
      await expect(staff.findForSignIn(email)).resolves.toBeNull();
    }
  });
});
