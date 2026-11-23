# Step 59.16: The product's brand inside the app

> **Written from the real diff on 2026-11-23.** The owner noticed the Bantay Aral logo shows on login but not once signed in, and chose option A of three. No architect review (a small visual change, no data or cost). Story: `docs/BUILD-LOG.md`, "Step 59.16"; how the shell is put together: `docs/APP-SHELL.md`, "Step 59.16".

## Why

The sidebar's header belongs to the school (its logo and name). The product's own mark appeared there only for a super admin with no school open, so every principal and teacher saw no Bantay Aral branding after login.

```
 +----------------------+
 | [school logo] School |   <- the school's, unchanged
 |  Dashboard           |
 |  Attendance ...      |
 |                      |
 |----------------------|
 | Powered by [logo]    |   <- new: the product signs the page
 +----------------------+
```

## The changes

**1. `src/components/app-shell/sidebar.tsx`:** a new component, then used inside `Sidebar`.

```tsx
export function SidebarProductBrand({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 px-2", className)}>
      <span className="text-xs text-muted-foreground">Powered by</span>
      <BantayAralLogo size="sm" />
    </div>
  );
}
```

In `Sidebar`, after `NavLinks` (which is `flex-1`, so it pushes the brand to the bottom): `{school ? <SidebarProductBrand className="border-t border-border pt-4" /> : null}`. The `school ?` check hides it when no school is open, because the header already shows the mark then.

**2. The `<aside>` is pinned to the screen's height.** Without it the sidebar was as tall as the page and its foot was off-screen on a long page. The classes added: `sticky top-0 h-dvh self-start overflow-y-auto`.

**3. `src/components/app-shell/mobile-nav.tsx`:** the drawer's footer gets `{school ? <SidebarProductBrand className="pt-2" /> : null}` under Sign out.

**4. `src/components/app-shell/sidebar.test.tsx` (new):** with a school, "Powered by" and the "Bantay Aral" image are there; with no school, neither is.

## Dead end

A tagline ("Every school day, connected with care.") under the wordmark would wrap in the 224px column, so it is not used. The logo alone is enough.

## Checks

The usual routine (`docs/LEARNING-LOG.md`), then:

```bash
npx vitest run src/components/app-shell
npm run dev   # sign in as a principal: foot of the sidebar at 1280px; open the menu at 360px; light and dark
```
