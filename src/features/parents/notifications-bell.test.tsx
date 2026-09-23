import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { NotificationsBell } from "./notifications-bell";
import type { ParentNotificationItem } from "./notifications-data";

// The server actions have their own coverage; mocking them keeps
// next/cache and the mock repositories out of this component test's
// import graph, so the test can run as pure client rendering.
vi.mock("./notification-actions", () => ({
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}));

// Radix's dropdown content measures itself with ResizeObserver, which
// jsdom doesn't implement; a no-op stub is enough for render-and-read
// assertions (no real layout happens in jsdom).
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

function item(
  overrides: {
    notification?: Partial<ParentNotificationItem["notification"]>;
    student?: Partial<ParentNotificationItem["student"]>;
  } = {},
): ParentNotificationItem {
  return {
    notification: {
      id: "notif-1",
      schoolId: "school-a",
      studentId: "student-1",
      kind: "time_in",
      tappedAt: "2026-06-20T07:56:00Z",
      read: false,
      ...overrides.notification,
    },
    student: {
      id: "student-1",
      schoolId: "school-a",
      firstName: "Juan",
      lastName: "Dela Cruz",
      birthDate: "2012-01-01",
      gradeLevel: 7,
      section: "Rizal",
      guardianName: "Maria Dela Cruz",
      guardianMobile: "09171234567",
      ...overrides.student,
    },
  };
}

describe("NotificationsBell", () => {
  it("shows the unread count on the badge and in the trigger label", () => {
    const items = [
      item({ notification: { id: "n-1", studentId: "s-1" } }),
      item({ notification: { id: "n-2", studentId: "s-1" } }),
      item({ notification: { id: "n-3", studentId: "s-1" } }),
      // One already-read item must not add to the count.
      item({ notification: { id: "n-4", studentId: "s-1", read: true } }),
    ];
    render(<NotificationsBell items={items} />);

    expect(screen.getByRole("button", { name: "Notifications, 3 unread" })).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("caps the badge at 9+ while the label keeps the true count", () => {
    const items = Array.from({ length: 12 }, (_, index) =>
      item({ notification: { id: `n-${index}`, studentId: "s-1" } }),
    );
    render(<NotificationsBell items={items} />);

    expect(screen.getByRole("button", { name: "Notifications, 12 unread" })).toBeInTheDocument();
    expect(screen.getByText("9+")).toBeInTheDocument();
  });

  it("hides the badge when everything is read", () => {
    const items = [item({ notification: { id: "n-1", studentId: "s-1", read: true } })];
    render(<NotificationsBell items={items} />);

    const trigger = screen.getByRole("button", { name: "Notifications" });
    expect(trigger).toBeInTheDocument();
    // The trigger then contains only the bell icon — no count text at all.
    expect(trigger).toHaveTextContent("");
  });

  it("opens to a friendly empty message when there are no notifications", () => {
    render(<NotificationsBell items={[]} />);

    // Radix's trigger opens on pointerdown only for a plain left click
    // (`button === 0 && ctrlKey === false`); jsdom's fallback Event leaves
    // ctrlKey undefined otherwise, so pass it explicitly.
    fireEvent.pointerDown(screen.getByRole("button", { name: "Notifications" }), {
      button: 0,
      ctrlKey: false,
    });

    expect(screen.getByText(/no notifications yet/i)).toBeInTheDocument();
  });

  it("shows the newest items as name, kind and time when opened", () => {
    const items = [
      item({
        notification: { id: "n-1", studentId: "s-1", kind: "time_out", tappedAt: "2026-06-20T16:05:00Z" },
        student: { firstName: "Ana" },
      }),
      item({
        notification: { id: "n-2", studentId: "s-1", kind: "time_in", tappedAt: "2026-06-20T07:56:00Z" },
      }),
    ];
    render(<NotificationsBell items={items} />);

    fireEvent.pointerDown(screen.getByRole("button", { name: "Notifications, 2 unread" }), {
      button: 0,
      ctrlKey: false,
    });

    expect(screen.getByText(/ana/i)).toBeInTheDocument();
    expect(screen.getByText(/tapped out/i)).toBeInTheDocument();
    expect(screen.getByText(/tapped in/i)).toBeInTheDocument();
    expect(screen.getByText("4:05 PM")).toBeInTheDocument();
    expect(screen.getByText("View all")).toBeInTheDocument();
  });
});
