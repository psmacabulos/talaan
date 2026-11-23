# Step 59.15: Roomier tables

> **Written from the real diff on 2026-11-23.** The owner asked for it after the Devices page's design review (Step 59.12): every list's table looked cramped and flat. No architect review (a styling change, no data or cost). Story: `docs/BUILD-LOG.md`, "Step 59.15"; the look is documented in `docs/COMPONENTS.md`, "The shared table's look".

## Why

Text sat 8px from the table's edge, the header looked like another data row, and rows were tight. Every list page uses the one shared table, so the fix is in one file.

```
before:  | Device name      Type ...        |     8px of room, header = a bold data row
after:   |   Device name    Type ...        |     16px, a faint band, small muted labels, taller rows
```

## The changes

**1. `src/components/ui/table.tsx`:**

```tsx
// TableHeader: a faint tint that never takes a data row's hover tint
className={cn("bg-muted/40 [&_tr]:border-b [&_tr]:hover:bg-transparent", className)}

// TableHead: smaller and muted
"h-11 px-4 text-left align-middle text-xs font-medium whitespace-nowrap text-muted-foreground ..."

// TableCell: 16px at the sides, taller rows (was `p-2`)
"px-4 py-3 align-middle whitespace-nowrap ..."
```

The tint sits on the header and the table's frame (`rounded-lg border overflow-x-auto`) clips its corners, so it needs no radius of its own.

**2. `src/features/attendance/class-roll.tsx`:** the one place that wants the old density. It is unframed inside the dashboard card and keeps `px-0` to line up with the list beside it, so its header gets `bg-transparent` (no band in a card) and its cells `py-2` (the rows it always had). Its header cells keep `h-10`.

**3. `src/features/students/students-table.tsx`:** the LRN and Today headers carried `text-xs text-muted-foreground` by hand, which is now the default; removed.

No other page changed.

## Looked at

Every list page (Students, Staff, Attendance, Devices, Schools) at 1280px and 360px, in light and dark, against the owner's running dev server: nothing scrolls sideways, the band and spacing show in both themes. At 360px those pages show their card lists, not the table (Step 27), so the table change isn't visible there.

## Checks

```bash
npm run lint && npm run check:tokens && npm run typecheck && npm test && npm run build
npm run test:a11y   # axe: the muted header text on its tint must keep 4.5:1
npm run test:e2e
```
