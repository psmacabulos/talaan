import { LayoutDashboard } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        as="h2"
        title="Dashboard"
        description="Who's in school right now, by grade level."
      />
      <EmptyState
        icon={LayoutDashboard}
        title="Not built yet"
        description="The live attendance summary, grade-level breakdown and tap feed are built in Step 13."
      />
    </div>
  );
}
