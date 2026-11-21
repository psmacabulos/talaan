import type { SVGProps } from "react";
import { cn } from "@/lib/utils";
import type { Device } from "./types";

/**
 * The Devices page's own drawings (Step 59.12), in the design board's flat
 * outline style. They draw with `currentColor` and the theme's fill
 * utilities only, so they follow the school's theme and dark mode, and stay
 * sharp at any size. Every one is decorative: the text beside it names the
 * device.
 */
type GlyphProps = Omit<SVGProps<SVGSVGElement>, "children">;

const GLYPH = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

/** A gate tablet: upright, with its camera dot and the tap waves on screen. */
export function GateTabletGlyph(props: GlyphProps) {
  return (
    <svg {...GLYPH} {...props}>
      <rect x="5.5" y="2.5" width="13" height="19" rx="2.75" fill="currentColor" fillOpacity={0.12} />
      <circle cx="12" cy="5" r="0.6" fill="currentColor" stroke="none" />
      <path d="M10 10a2.75 2.75 0 0 1 0 4.5" />
      <path d="M12.75 8.25a5.25 5.25 0 0 1 0 8" />
    </svg>
  );
}

/** A guardhouse monitor: a wide screen showing a list, on a stand. */
export function MonitorGlyph(props: GlyphProps) {
  return (
    <svg {...GLYPH} {...props}>
      <rect x="2.5" y="3.5" width="19" height="13" rx="2.25" fill="currentColor" fillOpacity={0.12} />
      <circle cx="6.75" cy="8" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="6.75" cy="12" r="0.9" fill="currentColor" stroke="none" />
      <path d="M9.5 8h7" strokeWidth={1.5} />
      <path d="M9.5 12h5" strokeWidth={1.5} />
      <path d="M12 16.5v3.5" />
      <path d="M8.5 20.5h7" />
    </svg>
  );
}

/** A device's kind, drawn in the school's own color. */
export function DeviceKindIcon({ kind, className }: { kind: Device["kind"]; className?: string }) {
  const Glyph = kind === "gate" ? GateTabletGlyph : MonitorGlyph;
  return <Glyph className={cn("size-8 shrink-0 text-primary", className)} />;
}

/**
 * The empty state's picture: a monitor with a gate tablet in front of it,
 * inside a pale circle, as on the board. The tablet's tap waves are the
 * only touch of the school's color.
 */
export function DevicesIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 180"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("text-muted-foreground", className)}
    >
      <circle cx="120" cy="90" r="84" className="fill-muted" />

      {/* The monitor, behind. */}
      <g stroke="currentColor" strokeWidth="2.5">
        <path d="M108 120v16M90 140h36" />
        <rect x="46" y="40" width="124" height="80" rx="9" className="fill-card" />
      </g>
      <rect x="55" y="49" width="106" height="62" rx="4" className="fill-muted" />
      <g className="fill-muted-foreground/45">
        <circle cx="68" cy="63" r="4" />
        <circle cx="68" cy="80" r="4" />
        <circle cx="68" cy="97" r="4" />
      </g>
      <g stroke="currentColor" strokeOpacity={0.45} strokeWidth="4">
        <path d="M80 63h44" />
        <path d="M80 80h32" />
        <path d="M80 97h38" />
      </g>

      {/* The gate tablet, in front. */}
      <rect x="142" y="70" width="54" height="84" rx="9" stroke="currentColor" strokeWidth="2.5" className="fill-card" />
      <rect x="149" y="82" width="40" height="62" rx="4" className="fill-muted" />
      <circle cx="169" cy="76" r="1.6" fill="currentColor" />
      <g className="text-primary" stroke="currentColor" strokeWidth="3">
        <circle cx="169" cy="113" r="14" strokeOpacity={0.35} />
        <path d="M165 108a7 7 0 0 1 0 10" />
        <path d="M171 104.5a12.5 12.5 0 0 1 0 17" />
      </g>
    </svg>
  );
}
