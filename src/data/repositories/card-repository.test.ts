import { describe, expect, it } from "vitest";
import type { Card } from "@/features/students/types";
import { createMockCardRepository } from "./card-repository";

const lostCard: Card = {
  id: "card-lost",
  schoolId: "school-a",
  studentId: "student-a",
  serial: "04:A3:5F:2B:91:C0:80",
  status: "lost",
  linkedAt: "2026-06-01T08:00:00Z",
};

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
  serial: "04:FF:FF:FF:FF:FF:FF",
  status: "active",
  linkedAt: "2026-06-01T08:00:00Z",
};

const allCards = [lostCard, activeCard, otherStudentCard];

describe("createMockCardRepository", () => {
  it("lists a student's full card history", async () => {
    const repo = createMockCardRepository(allCards, { latencyMs: 0 });
    await expect(repo.listByStudent("student-a")).resolves.toEqual([lostCard, activeCard]);
  });

  it("finds only the active card for a student", async () => {
    const repo = createMockCardRepository(allCards, { latencyMs: 0 });
    await expect(repo.getActiveForStudent("student-a")).resolves.toEqual(activeCard);
  });

  it("returns null when a student has no active card", async () => {
    const repo = createMockCardRepository([lostCard], { latencyMs: 0 });
    await expect(repo.getActiveForStudent("student-a")).resolves.toBeNull();
  });

  it("looks a card up by its serial", async () => {
    const repo = createMockCardRepository(allCards, { latencyMs: 0 });
    await expect(repo.getBySerial("04:11:22:33:44:55:66")).resolves.toEqual(activeCard);
  });

  it("returns null for an unknown serial", async () => {
    const repo = createMockCardRepository(allCards, { latencyMs: 0 });
    await expect(repo.getBySerial("00:00:00:00:00:00:00")).resolves.toBeNull();
  });

  it("creates a new card", async () => {
    const repo = createMockCardRepository([activeCard], { latencyMs: 0 });
    const newCard: Card = {
      id: "card-new",
      schoolId: "school-a",
      studentId: "student-c",
      serial: "04:AA:BB:CC:DD:EE:FF",
      status: "active",
      linkedAt: "2026-06-20T09:00:00Z",
    };
    await expect(repo.create(newCard)).resolves.toEqual(newCard);
    await expect(repo.getBySerial("04:AA:BB:CC:DD:EE:FF")).resolves.toEqual(newCard);
  });

  it("is idempotent when creating with an id that already exists", async () => {
    const repo = createMockCardRepository([activeCard], { latencyMs: 0 });
    await repo.create({ ...activeCard, serial: "04:00:00:00:00:00:99" });
    await expect(repo.getBySerial("04:11:22:33:44:55:66")).resolves.toEqual(activeCard);
  });

  it("marks a card lost", async () => {
    const repo = createMockCardRepository([activeCard], { latencyMs: 0 });
    const result = await repo.markLost("card-active");
    expect(result?.status).toBe("lost");
    await expect(repo.getActiveForStudent("student-a")).resolves.toBeNull();
  });

  it("returns null when marking an unknown card lost", async () => {
    const repo = createMockCardRepository([activeCard], { latencyMs: 0 });
    await expect(repo.markLost("nope")).resolves.toBeNull();
  });
});
