import { CalendarCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export default function AttendancePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        as="h2"
        title="Attendance"
        description="Pick a date and class to see who tapped in."
      />
      <EmptyState
        icon={CalendarCheck}
        title="Not built yet"
        description="Date, grade and section filters, and the class table, are built in Step 17."
      />
    </div>
  );
}
