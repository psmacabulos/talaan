import { PageHeader } from "@/components/page-header";

export default function StudentsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader as="h2" title="Students" description="Everyone enrolled at this school." />
      <p className="max-w-prose text-sm text-muted-foreground">
        The searchable student list arrives in Step 14, the add/edit form in Step 15, and card
        linking in Step 16.
      </p>
    </div>
  );
}
