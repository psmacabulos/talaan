import { describe, expect, it } from "vitest";
import { createMockCardRepository } from "@/data/repositories";
import type { Card } from "./types";
import { checkSerial, NOT_A_SERIAL, prepareCardChange } from "./card-changes";
import { NO_CARD_CHANGE } from "./student-changes";

const activeCard: Card = {
  id: "card-active",
  schoolId: "school-a",
  studentId: "student-a",
  serial: "04:11:22:33:44:55:66",
  status: "active",
  linkedAt: "2026-06-15T08:00:00Z",
};

const otherStudentCard: Card = {
  id: "card-other",
  schoolId: "school-a",
  studentId: "student-b",
  serial: "53:2E:98:0C",
  status: "active",
  linkedAt: "2026-06-01T08:00:00Z",
};

function setup(cards: Card[] = [activeCard, otherStudentCard]) {
  const data = cards.map((card) => ({ ...card }));
  return { data, deps: { cards: createMockCardRepository(data, { latencyMs: 0 }) } };
}

describe("checkSerial", () => {
  it("answers with the stored form of the reader's 10 digits, and saves nothing", async () => {
    const { data, deps } = setup();
    // 0211626835 is a different sticker from student-b's 53:2E:98:0C.
    const result = await checkSerial("school-a", "0211626835", deps);
    expect(result).toEqual({ ok: true, serial: "53:2B:9D:0C" });
    expect(data).toHaveLength(2);
  });

  it("refuses something that isn't a serial", async () => {
    const { deps } = setup();
    expect(await checkSerial("school-a", "hello", deps)).toEqual({ ok: false, message: NOT_A_SERIAL });
    expect(await checkSerial("school-a", 42, deps)).toEqual({ ok: false, message: NOT_A_SERIAL });
  });

  it("refuses a card that's already another student's", async () => {
    const { deps } = setup();
    const result = await checkSerial("school-a", "0211299923", deps);
    expect(result).toEqual({ ok: false, message: "This card is already linked to another student." });
  });
});

describe("prepareCardChange", () => {
  it("does nothing when nothing was chosen", async () => {
    const { data, deps } = setup();
    const prepared = await prepareCardChange("school-a", "student-a", NO_CARD_CHANGE, deps);
    expect(prepared.ok).toBe(true);
    if (prepared.ok) await prepared.apply("student-a");
    expect(data).toEqual([activeCard, otherStudentCard]);
  });

  it("checks without saving, and links only when applied", async () => {
    const { data, deps } = setup([otherStudentCard]);
    const prepared = await prepareCardChange(
      "school-a",
      "student-a",
      { replaceLost: false, link: { kind: "reader", serial: "53:2B:9D:0C" } },
      deps,
    );
    expect(data).toHaveLength(1);
    expect(prepared.ok).toBe(true);
    if (prepared.ok) await prepared.apply("student-a");
    expect(data).toContainEqual(
      expect.objectContaining({ studentId: "student-a", serial: "53:2B:9D:0C", status: "active" }),
    );
  });

  it("marks the old card lost only when applied, together with the new one", async () => {
    const { data, deps } = setup();
    const prepared = await prepareCardChange(
      "school-a",
      "student-a",
      { replaceLost: true, link: { kind: "reader", serial: "0211626835" } },
      deps,
    );
    expect(data.find((card) => card.id === "card-active")?.status).toBe("active");
    if (!prepared.ok) throw new Error(prepared.message);
    await prepared.apply("student-a");
    expect(data.find((card) => card.id === "card-active")?.status).toBe("lost");
    expect(data.filter((card) => card.studentId === "student-a" && card.status === "active")).toHaveLength(1);
  });

  it("refuses a second card without replacing the first", async () => {
    const { deps } = setup();
    const prepared = await prepareCardChange(
      "school-a",
      "student-a",
      { replaceLost: false, link: { kind: "simulated" } },
      deps,
    );
    expect(prepared).toEqual({ ok: false, message: "This student already has a linked card. Replace it instead." });
  });

  it("refuses replacing when there's no card", async () => {
    const { deps } = setup([]);
    const prepared = await prepareCardChange("school-a", "student-a", { replaceLost: true, link: null }, deps);
    expect(prepared).toEqual({ ok: false, message: "This student has no linked card to replace." });
  });

  it("checks the reader's card again at save time", async () => {
    const { deps } = setup();
    const prepared = await prepareCardChange(
      "school-a",
      null,
      { replaceLost: false, link: { kind: "reader", serial: "53:2E:98:0C" } },
      deps,
    );
    expect(prepared).toEqual({ ok: false, message: "This card is already linked to another student." });
  });

  it("links a card to a student added in the same save", async () => {
    const { data, deps } = setup();
    const prepared = await prepareCardChange(
      "school-a",
      null,
      { replaceLost: false, link: { kind: "simulated" } },
      deps,
    );
    if (!prepared.ok) throw new Error(prepared.message);
    await prepared.apply("student-new");
    expect(data).toContainEqual(expect.objectContaining({ studentId: "student-new", status: "active" }));
  });
});
