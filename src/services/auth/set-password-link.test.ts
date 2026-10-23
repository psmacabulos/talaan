import { describe, expect, it } from "vitest";
import type { Staff } from "@/features/staff/types";
import { createMockStaffRepository } from "@/data/repositories/staff-repository";
import { makeStaffSessionCookie } from "@/lib/session-cookie";
import { makeSetPasswordToken, readSetPasswordToken, setPasswordPath, setPasswordUrl } from "./set-password-link";

const SECRET = "test-secret-0123456789-0123456789-abcdef";
const NOW = new Date("2026-10-12T08:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

const invited: Staff = {
  id: "staff-new",
  schoolId: "school-a",
  role: "teacher",
  firstName: "Maria",
  lastName: "Santos",
  email: "maria@school-a.example",
  status: "invited",
};

function setup() {
  const staff = createMockStaffRepository([{ ...invited }], { latencyMs: 0 });
  return { staff, deps: { staff, secret: SECRET, now: NOW } };
}

describe("set-password links", () => {
  it("reads back the staff member a fresh link is for", async () => {
    const { deps } = setup();
    const token = makeSetPasswordToken(invited.id, null, SECRET, NOW);
    await expect(readSetPasswordToken(token, deps)).resolves.toMatchObject({ id: invited.id, firstName: "Maria" });
  });

  it("stops working once a password is set with it", async () => {
    const { staff, deps } = setup();
    const token = makeSetPasswordToken(invited.id, null, SECRET, NOW);
    await staff.setPassword(invited.id, "scrypt:new:hash");
    await expect(readSetPasswordToken(token, deps)).resolves.toBeNull();
  });

  it("stops working after 7 days", async () => {
    const { deps } = setup();
    const token = makeSetPasswordToken(invited.id, null, SECRET, NOW);
    await expect(
      readSetPasswordToken(token, { ...deps, now: new Date(NOW.getTime() + 6 * DAY) }),
    ).resolves.not.toBeNull();
    await expect(readSetPasswordToken(token, { ...deps, now: new Date(NOW.getTime() + 7 * DAY) })).resolves.toBeNull();
  });

  it("stops working after 1 hour when it was emailed (Step 55.5)", async () => {
    const { deps } = setup();
    const token = makeSetPasswordToken(invited.id, null, SECRET, NOW, 60 * 60);
    const at = (minutes: number) => ({ ...deps, now: new Date(NOW.getTime() + minutes * 60_000) });
    await expect(readSetPasswordToken(token, at(59))).resolves.not.toBeNull();
    await expect(readSetPasswordToken(token, at(60))).resolves.toBeNull();
  });

  it("builds an emailed link on the app's own address", () => {
    expect(setPasswordUrl("a.b", "https://bantayaral.herokuapp.com")).toBe(
      "https://bantayaral.herokuapp.com/set-password?token=a.b",
    );
  });

  it("refuses a staff session cookie, which was signed for another purpose", async () => {
    const { deps } = setup();
    const cookie = makeStaffSessionCookie({ staffId: invited.id, pv: "none" }, SECRET, NOW);
    await expect(readSetPasswordToken(cookie, deps)).resolves.toBeNull();
  });

  it("refuses a link for a staff member who was removed", async () => {
    const { staff, deps } = setup();
    const token = makeSetPasswordToken(invited.id, null, SECRET, NOW);
    await staff.remove("school-a", invited.id);
    await expect(readSetPasswordToken(token, deps)).resolves.toBeNull();
  });

  it("refuses a missing or made-up token", async () => {
    const { deps } = setup();
    await expect(readSetPasswordToken(undefined, deps)).resolves.toBeNull();
    await expect(readSetPasswordToken("made.up", deps)).resolves.toBeNull();
  });

  it("puts the token in the page's address, safely encoded", () => {
    expect(setPasswordPath("abc.d-_")).toBe("/set-password?token=abc.d-_");
  });
});
