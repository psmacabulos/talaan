import type { LinkedGuardian } from "@/features/parents/types";
import { PRODUCT_NAME } from "@/lib/product";
import { formatSchoolDate } from "@/lib/school-time";

/**
 * The drawer's "Parent accounts" (Step 55.3): who has linked this child in
 * the parent app, so a principal can spot someone who shouldn't have.
 * Read-only: nothing here is part of the form's Save. Name, mobile and the
 * day they linked; never the parent's email.
 */
export function LinkedParents({ childFirstName, guardians }: { childFirstName: string; guardians: LinkedGuardian[] }) {
  return (
    <section aria-labelledby="linked-parents-heading" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 id="linked-parents-heading" className="font-heading text-sm font-semibold text-foreground">
          Parent accounts
        </h3>
        <p className="text-sm text-muted-foreground">
          Parents who linked {childFirstName} in the {PRODUCT_NAME} app. They see {childFirstName}&apos;s arrivals and
          get notifications about {childFirstName}.
        </p>
      </div>
      {guardians.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
          No parent has linked {childFirstName} in the app yet.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {guardians.map(({ linkId, linkedAt, parent }) => (
            <li key={linkId} className="flex flex-col gap-0.5 px-3 py-2.5">
              <span className="font-medium text-foreground">
                {parent.firstName} {parent.lastName}
              </span>
              <span className="text-sm text-muted-foreground">
                {parent.mobile} · Linked {formatSchoolDate(linkedAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
