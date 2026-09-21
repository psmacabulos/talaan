import { Nfc } from "lucide-react";

/**
 * Below `lg`, LoginArtPanel (its full desktop treatment) is hidden
 * entirely rather than stacking above the form — this compact,
 * self-contained card takes its place instead. Same generic, no-school
 * branding as the desktop panel; see that file's own comment.
 */
export function LoginMobileHeader() {
  return (
    <div className="relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl border border-border bg-card px-6 py-7 text-center lg:hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "linear-gradient(color-mix(in oklch, var(--border) 55%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklch, var(--border) 55%, transparent) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage: "radial-gradient(ellipse 90% 90% at 50% 40%, black 45%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 90% 90% at 50% 40%, black 45%, transparent 100%)",
        }}
      />
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
        <Nfc className="size-5" aria-hidden="true" />
      </span>
      <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Attendance portal
      </h1>
    </div>
  );
}
