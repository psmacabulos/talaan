import { Skeleton } from "@/components/ui/skeleton";

/**
 * Mirrors the notifications page's shape: heading, then one day-group
 * header and three rows. This one is page-level (takes precedence over the
 * group-level `(protected)/loading.tsx`, which mirrors the dashboard).
 */
export default function NotificationsLoading() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}
