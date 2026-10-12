import "dotenv/config";
import { parseArgs } from "node:util";
import { staffRepository } from "@/data/repositories";
import { SET_PASSWORD_LINK_DAYS } from "@/features/auth/set-password-rules";
import { staffSchema } from "@/features/staff/schemas";
import { prisma } from "@/lib/db";
import { sessionSecret } from "@/lib/env";
import { makeSetPasswordToken, setPasswordPath } from "@/services/auth/set-password-link";

const USAGE = [
  "Usage:",
  "  npm run staff:link -- --email <email>",
  '  npm run staff:link -- --create-super-admin --email <email> --first-name <name> --last-name <name>',
].join("\n");

/**
 * Prints a set-password link's path for a staff member (Step 50.5): the
 * same one the Staff page makes, signed with the same SESSION_SECRET, so
 * the app accepts it. With --create-super-admin it first creates a super
 * admin, which is how the very first account on a new server gets in.
 * Runs against whatever DATABASE_URL points at: locally, or on the server
 * (`heroku run npm run staff:link -- …`, Step 52).
 */
async function main() {
  const { values } = parseArgs({
    options: {
      email: { type: "string" },
      "create-super-admin": { type: "boolean", default: false },
      "first-name": { type: "string" },
      "last-name": { type: "string" },
    },
  });

  const email = values.email?.trim().toLowerCase();
  if (!email) throw new Error(USAGE);

  if (values["create-super-admin"]) {
    if (await staffRepository.findByEmail(email)) {
      throw new Error(`Someone already uses ${email}. Leave out --create-super-admin to make a link for them.`);
    }
    const parsed = staffSchema.safeParse({
      id: crypto.randomUUID(),
      schoolId: null,
      role: "super_admin",
      firstName: values["first-name"]?.trim(),
      lastName: values["last-name"]?.trim(),
      email,
      status: "invited",
    });
    if (!parsed.success) throw new Error(`${parsed.error.issues.map((issue) => issue.message).join(". ")}\n\n${USAGE}`);
    await staffRepository.create(parsed.data);
    console.log(`Created super admin ${parsed.data.firstName} ${parsed.data.lastName} (${email}).`);
  }

  const found = await staffRepository.findForSignIn(email);
  if (!found) throw new Error(`No staff account uses ${email}.`);

  const token = makeSetPasswordToken(found.staff.id, found.passwordHash, sessionSecret(), new Date());
  console.log(
    found.passwordHash
      ? `Password reset link for ${found.staff.firstName} ${found.staff.lastName}. Using it signs them out everywhere else.`
      : `Sign-in link for ${found.staff.firstName} ${found.staff.lastName}, to set their first password.`,
  );
  console.log(
    `It works once, for ${SET_PASSWORD_LINK_DAYS} days. Put your site's address in front of it (http://localhost:3000 locally):`,
  );
  console.log("");
  console.log(setPasswordPath(token));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
