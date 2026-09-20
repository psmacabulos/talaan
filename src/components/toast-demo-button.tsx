"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ToastDemoButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() =>
        toast("Attendance saved", {
          description: "Juan Dela Cruz marked present at 7:58 AM.",
        })
      }
    >
      Show a toast
    </Button>
  );
}
