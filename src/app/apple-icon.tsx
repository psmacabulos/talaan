import { ImageResponse } from "next/og";
import { markSvgMarkup } from "@/components/brand/mark-shapes";
import { BRAND_ICON_BACKGROUND, BRAND_MARK_LIGHT } from "@/lib/theme/brand";

/** The phone home-screen icon (Step 51.6): the mark on a plain tile, which the phone rounds itself. */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const src = `data:image/svg+xml;utf8,${encodeURIComponent(markSvgMarkup(BRAND_MARK_LIGHT))}`;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: BRAND_ICON_BACKGROUND,
      }}
    >
      <img src={src} width={132} height={125} alt="" />
    </div>,
    size,
  );
}
