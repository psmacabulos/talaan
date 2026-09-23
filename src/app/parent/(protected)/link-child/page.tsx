import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { LinkChildForm } from "@/features/parents/link-child-form";
import { getParentSession } from "@/lib/parent-session";

export default async function LinkChildPage() {
  const session = await getParentSession();
  if (!session) redirect("/parent/login");

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-10 sm:px-6">
      <PageHeader
        title="Link a child"
        description="Enter your child's LRN, last name and birth date exactly as the school has them on file."
      />
      <LinkChildForm />
    </div>
  );
}
