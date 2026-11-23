"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Reloads the page's server data on a timer, drawing nothing (Step 59.14).
 * The guardhouse screen's "isn't connected" page uses it, so a monitor the
 * office has just enabled again carries on by itself, instead of waiting
 * for someone to reload the TV.
 */
export function RefreshEvery({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds]);
  return null;
}
