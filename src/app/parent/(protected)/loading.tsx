import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors the parent home (Step 59.5): the heading, then two card-shaped
 * placeholders (photo, name, class, status, and the times panel), so a
 * parent with several children sees roughly what's coming.
 */
export default function ParentProtectedLoading() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex flex-col gap-4">
        {[0, 1].map((key) => (
          <div key={key} className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
            <div className="flex gap-4">
              <Skeleton className="aspect-[4/5] w-16 rounded-lg" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-16 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
