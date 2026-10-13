import Image from "next/image";
import Link from "next/link";
import { Bell, Nfc, School, type LucideIcon } from "lucide-react";
import { BantayAralLogo } from "@/components/brand/bantay-aral-logo";
import { MARK } from "@/components/brand/mark-shapes";

/**
 * What the product does, in the order it happens. Plain claims the app
 * actually keeps, not marketing copy (CLAUDE.md, students are minors: no
 * promises about safety the app can't measure).
 */
const POINTS: { icon: LucideIcon; text: string }[] = [
  { icon: Nfc, text: "Students tap their ID card at the gate" },
  { icon: Bell, text: "Parents get a notification right away" },
  { icon: School, text: "Built for Philippine schools" },
];

/**
 * The desktop sign-in panel (Step 51.6, from the owner's brand sheet):
 * the Bantay Aral logo, a two-tone headline, three points, and a photo of
 * a student tapping in with a live notification card over it. Product
 * branding only, never one school's: this screen renders before any school
 * is known (multi-tenant). Below `lg` it's hidden and
 * login-mobile-header.tsx shows instead, so a phone opens on the form. The
 * photo appears from `xl`, where there's room beside the text.
 */
export function LoginArtPanel() {
  return (
    <section className="relative isolate hidden flex-col overflow-hidden border-border bg-background px-10 py-10 lg:flex lg:border-r xl:px-14">
      {/* Two soft washes of the brand's colors, behind everything. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 60% 50% at 85% 20%, color-mix(in oklch, var(--brand-child) 12%, transparent), transparent 70%), radial-gradient(ellipse 55% 45% at 10% 95%, color-mix(in oklch, var(--brand-parent-top) 12%, transparent), transparent 70%)",
        }}
      />

      {/* Back to the main page (the sign-in page, or the dashboard when signed in). */}
      <Link
        href="/"
        className="w-fit rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <BantayAralLogo size="sm" />
      </Link>

      <div className="flex flex-1 items-center py-10">
        <div className="grid w-full items-center gap-10 xl:grid-cols-[minmax(18.75rem,0.8fr)_minmax(0,1.2fr)] 2xl:grid-cols-2">
          <div className="flex flex-col gap-6">
            <span className="w-fit rounded-full bg-brand-parent/10 px-3 py-1 text-xs font-medium text-brand-parent">
              School attendance portal
            </span>
            <h1 className="font-heading text-4xl leading-[1.1] font-bold tracking-tight text-balance text-foreground 2xl:text-5xl">
              Every school day, <span className="text-brand-green-text">connected with care.</span>
            </h1>
            <p className="max-w-[32ch] text-lg text-muted-foreground">
              See who&apos;s in school, the moment they tap in.
            </p>
            <ul className="flex flex-col gap-3">
              {POINTS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm font-medium text-foreground">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-parent/10 text-brand-parent">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <SignInPhoto />
        </div>
      </div>
    </section>
  );
}

/**
 * The photo (Step 51.6, review): a landscape 4:3 frame with rounded corners,
 * anchored left so the student, the hand, the card and the reader are all in
 * view, with the reader near the right edge but not touching it. The
 * notification a parent would get sits on the frame's bottom edge, under the
 * reader, so it never covers the tap itself. Decorative.
 */
function SignInPhoto() {
  return (
    <div aria-hidden="true" className="relative mx-auto hidden w-full max-w-xl xl:block">
      {/* The brand's two accents, behind the frame's corners. */}
      <span className="absolute -top-5 -left-5 size-24 rounded-full bg-brand-child/25" />
      <span className="absolute -bottom-6 -left-8 size-32 rounded-full bg-brand-parent-top/15" />

      <div className="relative aspect-4/3 overflow-hidden rounded-3xl shadow-(--shadow-card) ring-1 ring-border/70">
        <Image
          src="/brand/sign-in-photo.jpg"
          alt=""
          fill
          sizes="(min-width: 1280px) 40vw, 0px"
          className="object-cover object-left"
        />
      </div>

      {/* Matches what a parent's phone actually says (docs/NOTIFICATIONS.md). */}
      <div className="absolute right-4 -bottom-7 flex animate-in items-center gap-3 rounded-2xl border border-border bg-card py-2.5 pr-5 pl-2.5 shadow-(--shadow-md) delay-300 duration-500 fade-in-0 slide-in-from-bottom-2 fill-mode-both motion-reduce:animate-none">
        <span className="flex size-10 items-center justify-center rounded-full bg-brand-sun/20 text-brand-sun">
          <Bell className="size-5 fill-current" />
        </span>
        <span className="flex flex-col">
          <span className="text-sm font-semibold text-foreground">Juan tapped in</span>
          <span className="text-xs text-muted-foreground tabular-nums">8:02 AM</span>
        </span>
        <svg viewBox="78 4 28 30" className="absolute -top-5 -right-3 size-7">
          {MARK.rays.map((d) => (
            <path
              key={d}
              d={d}
              fill="none"
              strokeWidth={MARK.rayWidth}
              strokeLinecap="round"
              className="stroke-brand-sun"
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
