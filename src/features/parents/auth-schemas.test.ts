import { describe, expect, it } from "vitest";
import { linkChildSchema, parentLoginSchema, parentSignupSchema } from "./auth-schemas";

describe("parentSignupSchema", () => {
  const validSignup = {
    firstName: "Maria",
    lastName: "Dela Cruz",
    mobile: "09171234567",
    email: "maria@example.com",
    password: "testpass123",
    confirmPassword: "testpass123",
  };

  it("needs no school (Step 53)", () => {
    expect(parentSignupSchema.safeParse(validSignup).success).toBe(true);
  });

  it("trims and lowercases the email before checking it (Step 53.1)", () => {
    expect(parentSignupSchema.parse({ ...validSignup, email: " Ana@X.com " }).email).toBe("ana@x.com");
  });

  it("still rejects an email that isn't one", () => {
    const result = parentSignupSchema.safeParse({ ...validSignup, email: " not an email " });
    expect(result.error?.flatten().fieldErrors.email).toEqual(["Enter a valid email address"]);
  });

  it("drops a school sent anyway", () => {
    const parsed = parentSignupSchema.parse({ ...validSignup, schoolId: "school-balanga" });
    expect(parsed).not.toHaveProperty("schoolId");
  });
});

describe("parentLoginSchema", () => {
  it("trims and lowercases the email, like sign-up", () => {
    expect(parentLoginSchema.parse({ email: " MARIA@Example.com ", password: "x" }).email).toBe("maria@example.com");
  });
});

describe("linkChildSchema", () => {
  const validLink = { schoolId: "school-balanga", lrn: "100000000123", lastName: "Dela Cruz", birthDate: "2012-05-14" };

  it("accepts a school and the three details", () => {
    expect(linkChildSchema.safeParse(validLink).success).toBe(true);
  });

  it("asks for the school (Step 53)", () => {
    const result = linkChildSchema.safeParse({ ...validLink, schoolId: "" });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.schoolId).toEqual(["Select your child's school"]);
  });
});
