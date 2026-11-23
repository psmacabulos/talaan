import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { parentRepository } from "@/data/repositories";
import { DeleteAccountDialog } from "@/features/parents/delete-account-dialog";
import { getParentSession } from "@/lib/parent-session";

/**
 * The parent's account (Step 60.2): who the account is, and "Delete my
 * account", which both app stores require before an app that makes accounts
 * can be published. Name, email and mobile are read-only here.
 */
export default async function ParentAccountPage() {
  const session = await getParentSession();
  if (!session) redirect("/parent/login");

  const parent = await parentRepository.getById(session.parentId);
  if (!parent) redirect("/parent/login");

  const details = [
    { label: "Name", value: `${parent.firstName} ${parent.lastName}` },
    { label: "Email", value: parent.email },
    { label: "Mobile", value: parent.mobile },
  ];

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 py-10 sm:px-6">
      <PageHeader title="Your account" description="The details your children's schools see when you link a child." />

      <dl className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
        {details.map((detail) => (
          <div key={detail.label} className="flex flex-col gap-0.5 px-4 py-3">
            <dt className="text-sm text-muted-foreground">{detail.label}</dt>
            <dd className="text-sm font-medium text-foreground wrap-break-word">{detail.value}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="delete-account-heading" className="flex flex-col gap-3">
        <h2 id="delete-account-heading" className="font-heading text-lg font-semibold text-foreground">
          Delete your account
        </h2>
        <p className="text-sm text-muted-foreground">
          This deletes your account, your sign-ins on every phone, your notifications and your links to your children.
          Your children&apos;s attendance records belong to the school and stay with it, and any other guardian of your
          child keeps their access. It can&apos;t be undone.
        </p>
        <div>
          <DeleteAccountDialog />
        </div>
      </section>
    </div>
  );
}
