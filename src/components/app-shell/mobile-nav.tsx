"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { Role } from "@/features/staff/types";
import type { School } from "@/features/schools/types";
import { NavLinks } from "./nav-links";
import { SidebarBrand } from "./sidebar";

/** The <900px equivalent of the sidebar (design/school-portal-prototype.html) — an off-canvas drawer, closing itself once a link is tapped. */
export function MobileNav({
  role,
  school,
}: {
  role: Role;
  school: School | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-lg" className="lg:hidden" aria-label="Open navigation menu">
          <Menu aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 gap-0 p-0">
        {/* pr-8 keeps the truncated school name clear of SheetContent's
            absolutely-positioned close button. */}
        <SheetHeader className="border-b border-border pr-8">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <SheetDescription className="sr-only">
            Move between the sections of the app.
          </SheetDescription>
          <SidebarBrand school={school} />
        </SheetHeader>
        <NavLinks role={role} onNavigate={() => setOpen(false)} className="p-4" />
      </SheetContent>
    </Sheet>
  );
}
