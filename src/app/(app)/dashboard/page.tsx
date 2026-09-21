import { PageHeader } from "@/components/page-header";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        as="h2"
        title="Dashboard"
        description="Who's in school right now, by grade level."
      />
      <p className="max-w-prose text-sm text-muted-foreground">
        The live attendance summary, grade-level breakdown and tap feed are built in Step 13.
      </p>
    </div>
  );
}
