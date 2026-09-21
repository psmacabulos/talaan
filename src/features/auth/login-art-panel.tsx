import { Bell, CalendarCheck, Nfc, type LucideIcon } from "lucide-react";
import { cn } from "cn";

/**
 * The three things this screen actually needs to say about the product —
 * pulled straight from CLAUDE.md's own one-paragraph description (tap →
 * recorded → shown to staff → parents notified), not invented marketing
 * copy. Order matches the real sequence of events. `tone` picks one of the
 * three color tokens safe to vary decoratively (never a status color —
 * CLAUDE.md's design-system rule 6 reserves those for actual attendance
 * meaning — and never destructive, reserved for actual destructive
 * actions).
 */
const VALUE_PROPS: { icon: LucideIcon; text: string; tone: "primary" | "highlight" | "accent" }[] = [
  { icon: Nfc, text: "Students tap their ID card at the gate", tone: "primary" },
  { icon: CalendarCheck, text: "Attendance updates in real time", tone: "highlight" },
  { icon: Bell, text: "Parents are notified automatically", tone: "accent" },
];

const TONE_CLASSES: Record<(typeof VALUE_PROPS)[number]["tone"], string> = {
  primary: "bg-primary text-primary-foreground",
  highlight: "bg-highlight text-highlight-foreground",
  accent: "bg-accent text-accent-foreground ring-2 ring-primary/40",
};

/** `--animate-value-prop-{1,2,3}` from globals.css, one per list position. */
const ANIMATION_CLASSES = ["animate-value-prop-1", "animate-value-prop-2", "animate-value-prop-3"];

/**
 * The desktop-and-up decorative left panel (`hidden lg:flex` — collapses
 * entirely below `lg`; login-mobile-header.tsx renders instead). Generic
 * on purpose: Talaan is multi-tenant and this screen renders before any
 * school is known, so it carries no specific school's name or logo — see
 * that file and docs/BUILD-LOG.md's Step 12 "review round 3." `Nfc` stands
 * in for a product mark (there isn't a real one yet) since it's the
 * product's actual defining mechanic, not a generic building/school icon.
 */
export function LoginArtPanel() {
  return (
    <section className="relative isolate hidden flex-col items-center justify-center overflow-hidden border-border bg-card px-6 py-16 sm:px-12 sm:py-20 lg:flex lg:border-r lg:px-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "linear-gradient(color-mix(in oklch, var(--border) 55%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklch, var(--border) 55%, transparent) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage:
            "radial-gradient(ellipse 65% 55% at 50% 42%, transparent 15%, black 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 65% 55% at 50% 42%, transparent 15%, black 100%)",
        }}
      />

      <div className="flex w-full max-w-md flex-1 flex-col items-center justify-center gap-10 text-center lg:gap-12">
        <div className="relative flex animate-in items-center justify-center fade-in zoom-in-95 duration-700">
          {/* A tight halo, not a big diffuse cloud: a fixed 20px ring
              around the badge itself, not a scaled-up+heavily-blurred copy
              (the first version of this — too large and washed-out, see
              docs/BUILD-LOG.md's Step 12 "review round 5"). */}
          <div
            aria-hidden="true"
            className="absolute -inset-5 -z-10 rounded-full blur-lg"
            style={{ backgroundColor: "color-mix(in oklch, var(--primary) 45%, transparent)" }}
          />
          <span className="flex size-24 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg lg:size-28">
            <Nfc className="size-10 lg:size-12" aria-hidden="true" />
          </span>
        </div>

        <div className="flex flex-col items-center gap-5">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Attendance portal
          </h1>
          <p className="max-w-[26ch] text-lg text-muted-foreground sm:text-xl">
            See who&apos;s in school, the moment they tap in.
          </p>
        </div>

        {/* One value prop visible at a time, centered as a single unit,
            cycling on a loop (see globals.css's `value-prop-cycle`
            keyframe). Below `motion-reduce`, all three render at once,
            statically, stacked — see that keyframe's own comment for why
            the blanket reduced-motion rule alone isn't safe to rely on
            here (it would otherwise make every item disappear). */}
        <div className="relative min-h-10 w-full motion-reduce:min-h-0">
          {VALUE_PROPS.map(({ icon: Icon, text, tone }, index) => (
            <div
              key={text}
              className={cn(
                "absolute inset-0 flex items-center justify-center gap-3 opacity-0",
                ANIMATION_CLASSES[index],
                "motion-reduce:static motion-reduce:animate-none motion-reduce:opacity-100",
                index < VALUE_PROPS.length - 1 && "motion-reduce:mb-3",
              )}
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full",
                  TONE_CLASSES[tone],
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="text-sm font-medium text-foreground">{text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
