import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { DevicesList } from "./devices-list";
import type { Device } from "./types";

const NOW = "2026-06-19T01:15:00.000Z";

const devices: Device[] = [
  {
    id: "d1",
    schoolId: "school-a",
    label: "Main gate tablet",
    kind: "gate",
    status: "active",
    lastSeenAt: "2026-06-19T01:13:00.000Z",
  },
  { id: "d2", schoolId: "school-a", label: "Guardhouse monitor", kind: "monitor", status: "active", lastSeenAt: null },
  {
    id: "d3",
    schoolId: "school-a",
    label: "Gym monitor",
    kind: "monitor",
    status: "revoked",
    lastSeenAt: "2026-06-16T01:15:00.000Z",
  },
];

describe("DevicesList (Step 59.12)", () => {
  it("says there are no devices yet", () => {
    render(<DevicesList devices={[]} now={NOW} />);
    expect(screen.getByText("No devices yet")).toBeInTheDocument();
  });

  it("shows each device's type, connection, last seen and status in the table", () => {
    render(<DevicesList devices={devices} now={NOW} />);
    const rows = within(screen.getByRole("table")).getAllByRole("row");

    expect(rows[1]).toHaveTextContent("Main gate tabletGateOnline2 minutes agoEnabled");
    expect(rows[2]).toHaveTextContent("Guardhouse monitorMonitorNever connected—Enabled");
    expect(rows[3]).toHaveTextContent("Gym monitorMonitorOffline3 days agoDisabled");
  });

  it("shows the same devices as cards for a phone", () => {
    render(<DevicesList devices={devices} now={NOW} />);
    const cards = within(screen.getByRole("list", { name: "Devices" })).getAllByRole("listitem");

    expect(cards).toHaveLength(3);
    expect(cards[0]).toHaveTextContent("Main gate tablet");
    expect(cards[0]).toHaveTextContent("Online· 2 minutes ago");
    expect(cards[1]).toHaveTextContent("Never connected");
    expect(cards[2]).toHaveTextContent("Disabled");
  });
});
