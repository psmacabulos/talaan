import type { Metadata } from "next";
import { alertRepository, schoolRepository, studentRepository, tapRepository } from "@/data/repositories";
import { GateMonitor } from "@/features/gate/gate-monitor";
import { monitorEventsFromTaps } from "@/features/gate/monitor-events";
import { resolveMonitorViewer } from "@/features/gate/monitor-viewer";
import { getNow } from "@/lib/clock";
import { schoolDateOf } from "@/lib/school-time";

export const metadata: Metadata = { title: "Gate monitor · Talaan" };

/**
 * The guardhouse monitor (Step 48), for a TV connected by its link or a
 * principal or super admin signed in. One address for every school: the
 * school comes from who is asking (docs/ARCHITECTURE.md).
 */
export default async function GateDisplayPage({ searchParams }: PageProps<"/gate/display">) {
  const viewer = await resolveMonitorViewer();
  if (!viewer) {
    const { error } = await searchParams;
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background p-6">
        <div className="flex max-w-md flex-col gap-3 rounded-2xl border border-border bg-card p-6">
          <h1 className="font-heading text-2xl font-semibold text-foreground">
            {error === "key" ? "This link doesn't work" : "This screen isn't connected"}
          </h1>
          <p className="text-muted-foreground">
            {error === "key"
              ? "Ask the office for a new monitor link."
              : "The live gate feed is for a connected guardhouse screen, or a principal signed in. Ask the office to connect this screen."}
          </p>
        </div>
      </main>
    );
  }

  const { schoolId } = viewer;
  const [school, students, taps, alerts] = await Promise.all([
    schoolRepository.getById(schoolId),
    studentRepository.listBySchool(schoolId),
    tapRepository.listBySchoolOnDate(schoolId, schoolDateOf(getNow())),
    alertRepository.listBySchool(schoolId),
  ]);
  const lostCardTapIds = new Set(alerts.map((alert) => alert.tapId));

  return (
    <GateMonitor
      schoolName={school?.name ?? "Your school"}
      loaded={monitorEventsFromTaps(taps, students, lostCardTapIds)}
    />
  );
}
