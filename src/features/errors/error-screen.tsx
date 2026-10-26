"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Copy, FileText, RotateCw, TriangleAlert } from "lucide-react";
import { BantayAralLogo } from "@/components/brand/bantay-aral-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { ReportProblemDialog } from "./report-problem-dialog";

/**
 * The one error page (Step 59.1), for every kind of problem on every page,
 * following the owner's design: what happened, the reference code, Try
 * again and Report this problem. Only shows; the error page files decide
 * the reference and what Report does. `static/down/index.html` is its plain
 * HTML copy for when the server isn't running at all.
 */
export function ErrorScreen({
  reference,
  onRetry,
  onReport,
  showThemeToggle = true,
}: {
  reference?: string;
  onRetry: () => void;
  /** Sends a report with the person's note. Without it, there's no Report button. */
  onReport?: (note: string) => Promise<void>;
  /** Off in `global-error.tsx`, which has no theme provider. */
  showThemeToggle?: boolean;
}) {
  const [reporting, setReporting] = useState(false);

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-background text-foreground">
      <header className="flex items-center justify-between gap-4 px-4 py-4 sm:px-8 sm:py-6">
        <BantayAralLogo size="sm" className="sm:hidden" />
        <BantayAralLogo size="md" className="max-sm:hidden" />
        {showThemeToggle ? <ThemeToggle /> : null}
      </header>

      <main className="mx-auto grid w-full max-w-5xl flex-1 content-center items-center gap-6 px-4 pb-12 sm:px-8 md:grid-cols-2 md:gap-12 md:pb-20">
        <div className="flex flex-col gap-6 max-md:order-2">
          <div className="flex flex-col gap-3">
            <h1 className="font-heading text-4xl leading-tight font-bold tracking-tight sm:text-5xl">
              <span className="block text-brand-ink">Something</span>{" "}
              <span className="block text-brand-green-text">went wrong</span>
            </h1>
            <p className="max-w-md text-base text-muted-foreground sm:text-lg">
              We&apos;re sorry. An unexpected error happened. Please try again. If the problem continues, you can report
              it.
            </p>
          </div>

          <div className="flex w-full max-w-sm flex-col gap-3">
            {reference ? <ReferenceCode code={reference} /> : null}
            <Button size="lg" className="w-full" onClick={() => onRetry()}>
              <RotateCw data-icon="inline-start" />
              Try again
            </Button>
            {onReport ? (
              <Button variant="outline" size="lg" className="w-full" onClick={() => setReporting(true)}>
                <TriangleAlert data-icon="inline-start" />
                Report this problem
              </Button>
            ) : null}
          </div>
        </div>

        <Illustration />
      </main>

      {onReport ? <ReportProblemDialog open={reporting} onOpenChange={setReporting} onSend={onReport} /> : null}
    </div>
  );
}

/**
 * The confused student on a soft circle. The frame's lower half is round,
 * so the picture's flat bottom edge follows the circle, while the hair and
 * the question mark can still rise above it. Decorative, so screen readers
 * skip it. Small on a phone, so both buttons stay on screen at 360 × 640.
 */
function Illustration() {
  return (
    <div
      className="relative mx-auto aspect-square w-40 overflow-hidden rounded-b-full max-md:order-1 md:w-full md:max-w-sm"
      aria-hidden="true"
    >
      <span className="absolute inset-x-0 bottom-0 aspect-square rounded-full bg-accent" />
      <span className="absolute top-[6%] left-[4%] size-[12%] rounded-full bg-status-present-bg" />
      <Image
        src="/errors/confused-student.webp"
        alt=""
        width={640}
        height={816}
        loading="eager"
        sizes="(min-width: 768px) 384px, 160px"
        className="relative mx-auto h-full w-auto object-contain"
      />
    </div>
  );
}

type CopyState = "idle" | "copied" | "failed";

function ReferenceCode({ code }: { code: string }) {
  const [copy, setCopy] = useState<CopyState>("idle");

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopy("copied");
    } catch {
      // No clipboard over plain http, or permission refused.
      setCopy("failed");
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-xl bg-muted py-2 pr-2 pl-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card text-muted-foreground">
        <FileText className="size-5" aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm text-muted-foreground">Reference code</span>
        <span className="truncate font-heading font-semibold tabular-nums">{code}</span>
      </div>
      <Button variant="ghost" size="icon-lg" className="size-11" onClick={copyCode} aria-label="Copy reference code">
        {copy === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      </Button>
      <span className="sr-only" aria-live="polite">
        {copy === "copied" ? "Copied" : copy === "failed" ? "Couldn't copy. Select the code to copy it." : ""}
      </span>
    </div>
  );
}
