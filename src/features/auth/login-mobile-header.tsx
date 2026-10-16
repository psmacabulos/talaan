import Link from "next/link";
import { BantayAralLogo } from "@/components/brand/bantay-aral-logo";

/**
 * The sign-in screens' header below `lg` (Step 51.6), where the desktop
 * panel (login-art-panel.tsx) is hidden: the Bantay Aral logo and its line,
 * then straight to the form. The logo goes back to the main page. Product
 * branding only, never one school's: no school is known before sign-in.
 */
export function LoginMobileHeader() {
  return (
    <h1 className="flex justify-center lg:hidden">
      <Link href="/" className="rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
        <BantayAralLogo size="md" tagline />
      </Link>
    </h1>
  );
}
