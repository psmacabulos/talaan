import type { Metadata } from "next";
import { GateKiosk } from "@/features/gate/gate-kiosk";

export const metadata: Metadata = { title: "Gate · Talaan" };

/**
 * The gate tablet's page (Step 47). Outside the staff app shell, with no
 * staff sign-in: the tablet signs in with its own device token, kept on
 * the tablet itself (docs/GATE.md).
 */
export default function GatePage() {
  return <GateKiosk />;
}
