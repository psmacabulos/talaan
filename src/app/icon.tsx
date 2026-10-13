import { ImageResponse } from "next/og";
import { markSvgMarkup } from "@/components/brand/mark-shapes";
import { BRAND_MARK_LIGHT } from "@/lib/theme/brand";

/** The browser tab's icon (Step 51.6): the Bantay Aral mark, made at build time. */
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  const src = `data:image/svg+xml;utf8,${encodeURIComponent(markSvgMarkup(BRAND_MARK_LIGHT))}`;
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <img src={src} width={32} height={30} alt="" />
    </div>,
    size,
  );
}
