import Link from "next/link";
import { UserX } from "lucide-react";

/** A child who isn't linked to this parent, or doesn't exist: the same answer for both. */
export default function ParentChildNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <UserX className="size-10 text-muted-foreground" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold text-foreground">We couldn&apos;t find that child</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          They may not be linked to your account. Your linked children are on your home page.
        </p>
      </div>
      <Link
        href="/parent"
        className="rounded-sm text-sm font-medium text-link underline underline-offset-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        Go to My children
      </Link>
    </div>
  );
}
