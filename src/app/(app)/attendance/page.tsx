import { PageHeader } from "@/components/page-header";

export default function AttendancePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        as="h2"
        title="Attendance"
        description="Pick a date and class to see who tapped in."
      />
      <p className="max-w-prose text-sm text-muted-foreground">
        Date, grade and section filters, and the class table, are built in Step 17.
      </p>
    </div>
  );
}
