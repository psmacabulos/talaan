"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const SIZE = 176;

/**
 * A QR code of a monitor's one-time link (Step 59.13), for a phone or
 * tablet that will be the monitor: scanning it with that device's camera
 * opens the link there. It's drawn here in the browser, so the link never
 * goes to a QR service, and `qrcode` is loaded only when this opens, so the
 * Devices page itself doesn't carry it. Black on white (the library's own
 * defaults) in every theme, because a scanner needs the contrast.
 */
export function MonitorQr({ link }: { link: string }) {
  const [source, setSource] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("qrcode")
      .then(({ default: QRCode }) => QRCode.toDataURL(link, { width: SIZE * 2, margin: 2, errorCorrectionLevel: "M" }))
      .then((url) => {
        if (!cancelled) setSource(url);
      })
      .catch(() => {
        if (!cancelled) setSource(null);
      });
    return () => {
      cancelled = true;
    };
  }, [link]);

  return (
    <div className="flex size-44 items-center justify-center rounded-lg border border-border bg-muted">
      {source ? (
        <Image src={source} alt="QR code of the monitor link" width={SIZE} height={SIZE} unoptimized className="rounded-md" />
      ) : (
        <span className="text-xs text-muted-foreground">Making the QR code…</span>
      )}
    </div>
  );
}
