import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors a child's day: the back link, the photo and name, then the two lists. */
export default function ParentChildLoading() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
      <Skeleton className="h-5 w-28" />
      <div className="flex items-center gap-4">
        <Skeleton className="aspect-[4/5] w-20 rounded-lg" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
      {[0, 1].map((key) => (
        <div key={key} className="flex flex-col gap-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}
