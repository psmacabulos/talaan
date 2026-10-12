import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/features/auth/actions";
import { cn } from "@/lib/utils";

/**
 * Staff Sign out (Step 50.1). A plain form post to the `signOut` Server
 * Action, so it works before JavaScript loads. `placement="topbar"` is
 * compact (the word shows from md up, the icon alone below);
 * `placement="drawer"` is a full-width row the size of a nav link.
 */
export function SignOutButton({ placement }: { placement: "topbar" | "drawer" }) {
  return (
    <form action={signOut}>
      <Button
        type="submit"
        variant="ghost"
        size={placement === "topbar" ? "default" : "lg"}
        className={cn(
          "text-muted-foreground hover:text-foreground",
          placement === "drawer" && "w-full justify-start gap-3 px-3 text-sm font-medium",
        )}
      >
        <LogOut className="size-4 shrink-0" aria-hidden="true" />
        <span className={placement === "topbar" ? "sr-only md:not-sr-only" : undefined}>Sign out</span>
      </Button>
    </form>
  );
}
