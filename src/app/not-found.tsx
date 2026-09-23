import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-background px-6 py-24 text-center text-foreground">
      <Compass className="size-10 text-muted-foreground" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold">This page doesn&apos;t exist</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Check the address, or head back to a page that does.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="rounded-sm text-sm font-medium text-link underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Go to Dashboard
      </Link>
    </main>
  );
}
