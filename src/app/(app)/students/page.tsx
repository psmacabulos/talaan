import { Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";

export default function StudentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader as="h2" title="Students" description="Everyone enrolled at this school." />
      <EmptyState
        icon={Users}
        title="Not built yet"
        description="The searchable student list arrives in Step 14, the add/edit form in Step 15, and card linking in Step 16."
      />
    </div>
  );
}
