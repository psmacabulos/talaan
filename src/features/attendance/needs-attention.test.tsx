import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { OpenAlert } from "@/data/repositories";
import type { Student } from "@/features/students/types";
import { schoolTimeToIso } from "@/lib/school-time";

const markAlertHandled = vi.fn(async () => ({ ok: true as const }));
vi.mock("./actions", () => ({ markAlertHandled }));

const { NeedsAttention } = await import("./needs-attention");

const juan: Student = {
  id: "student-juan",
  schoolId: "school-a",
  firstName: "Juan",
  lastName: "Cruz",
  birthDate: "2013-01-02",
  gradeLevel: 7,
  section: "Rizal",
  guardianName: "Ana Cruz",
  guardianMobile: "09181234567",
};

const alert: OpenAlert = {
  id: "alert-1",
  schoolId: "school-a",
  tapId: "tap-1",
  studentId: juan.id,
  type: "lost_card_tapped",
  createdAt: schoolTimeToIso("2026-06-19", "08:05"),
  acknowledged: false,
  tap: {
    id: "tap-1",
    schoolId: "school-a",
    stationId: "gate",
    cardSerial: "04:11:6C:C7",
    // A lost card's tap has no student (Step 57): the alert names the owner.
    studentId: null,
    tappedAt: schoolTimeToIso("2026-06-19", "08:05"),
  },
};

describe("NeedsAttention", () => {
  it("names the lost card's owner and says the tap didn't count for them", () => {
    render(<NeedsAttention alerts={[alert]} students={[juan]} today="2026-06-19" />);
    expect(screen.getByText("Juan Cruz's card, at 8:05 AM. It didn't count as their time in.")).toBeInTheDocument();
  });

  it("marks an alert handled with its own button", async () => {
    render(<NeedsAttention alerts={[alert]} students={[juan]} today="2026-06-19" />);
    fireEvent.click(screen.getByRole("button", { name: "Mark handled: Juan Cruz's lost card" }));
    await waitFor(() => expect(markAlertHandled).toHaveBeenCalledWith("alert-1"));
  });

  it("says so when nothing is open", () => {
    render(<NeedsAttention alerts={[]} students={[juan]} today="2026-06-19" />);
    expect(screen.getByText("Nothing needs attention right now.")).toBeInTheDocument();
  });
});
