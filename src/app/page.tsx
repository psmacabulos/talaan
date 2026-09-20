import { UsersRound } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { presetToScopedCss } from "@/lib/theme/apply-preset";
import { getThemePreset, themePresets } from "@/lib/theme/presets";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusPill } from "@/components/status-pill";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ToastDemoButton } from "@/components/toast-demo-button";

const PREVIEW_SELECTOR = "[data-preset-preview]";

const coreTokens = [
  { label: "Background", className: "bg-background text-foreground border border-border" },
  { label: "Card", className: "bg-card text-card-foreground border border-border" },
  { label: "Primary", className: "bg-primary text-primary-foreground" },
  { label: "Muted", className: "bg-muted text-muted-foreground" },
  { label: "Accent", className: "bg-accent text-accent-foreground" },
  { label: "Highlight", className: "bg-highlight text-highlight-foreground" },
];

const statusTokens = [
  { label: "Present", className: "bg-status-present-bg text-status-present" },
  { label: "Late", className: "bg-status-late-bg text-status-late" },
  { label: "Absent", className: "bg-status-absent-bg text-status-absent" },
  { label: "Not yet tapped", className: "bg-status-idle-bg text-status-idle" },
];

// Step 5 verification aid ONLY: lets the owner preview every theme preset
// via ?preset=ocean|emerald|crimson|violet without a real picker UI (that's
// Steps 11/21). Scoped to this page's own content via PREVIEW_SELECTOR —
// it never touches <html> — so it needs none of the "no flash" machinery
// in src/lib/theme/apply-preset.ts. Remove once Step 11's dev switcher
// exists.
export default async function Home({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const requestedPreset = typeof params.preset === "string" ? params.preset : undefined;
  const preset = getThemePreset(requestedPreset);
  const previewCss = presetToScopedCss(preset, PREVIEW_SELECTOR);

  return (
    <div
      data-preset-preview
      className="flex flex-1 flex-col items-center bg-background px-6 py-16 text-foreground sm:px-10"
    >
      {/* Raw, hardcoded CSS text (never user input) — dangerouslySetInnerHTML
          is used so the string is set verbatim, not HTML-escaped. */}
      <style dangerouslySetInnerHTML={{ __html: previewCss }} />
      <div className="flex w-full max-w-3xl flex-col gap-10">
        <header className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold">Talaan design tokens</h1>
          <p className="max-w-xl text-muted-foreground">
            A look at the color, type and shadow tokens the rest of the app is
            built from. Every color here traces back to a named token in{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-sm text-muted-foreground">
              src/styles/tokens.css
            </code>{" "}
            — nothing is a raw hex value.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <ThemeToggle />
          </div>
          <p className="text-sm text-muted-foreground">
            Previewing <strong className="text-foreground">{preset.name}</strong>. Try another
            preset:{" "}
            {themePresets.map((option, index) => (
              <span key={option.id}>
                {index > 0 ? ", " : ""}
                <a
                  href={`/?preset=${option.id}`}
                  className="text-link underline underline-offset-2"
                >
                  {option.name}
                </a>
              </span>
            ))}
            . (A temporary Step 5 preview link — the real theme picker comes in later steps.)
          </p>
        </header>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">Core tokens</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {coreTokens.map((token) => (
              <div
                key={token.label}
                className={`flex h-20 items-end rounded-lg p-3 text-sm font-medium shadow-sm ${token.className}`}
              >
                {token.label}
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">Attendance status colors</h2>
          <p className="text-sm text-muted-foreground">
            Fixed in every theme — these keep the same meaning no matter which
            preset a school picks.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {statusTokens.map((token) => (
              <div
                key={token.label}
                className={`flex h-16 items-center justify-center rounded-md text-sm font-medium ${token.className}`}
              >
                {token.label}
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">Elevation</h2>
          <div className="flex flex-wrap gap-4">
            <div className="rounded-lg border border-border bg-card p-4 text-sm shadow-sm">
              shadow-sm
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-sm shadow-md">
              shadow-md
            </div>
            <div className="rounded-lg border border-border bg-card p-4 text-sm shadow-lg">
              shadow-lg
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">Type</h2>
          <p className="text-sm">
            Headings use <span className="font-heading font-semibold">Lexend</span>.
            Body text, like this paragraph, uses Atkinson Hyperlegible. A link
            would look like{" "}
            <a href="#" className="text-link underline">
              this
            </a>
            .
          </p>
        </section>

        {/* Step 6 verification aid: one example of every new shadcn/ui
            component and shared component, so it can be checked under every
            preset and color mode. This is not Step 7's real style guide
            (/design-system, dev-only, every state) — just enough to see
            everything rendered before that gets built properly. */}
        <section className="flex flex-col gap-6 border-t border-border pt-8">
          <h2 className="text-xl font-semibold">Components (Step 6)</h2>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Buttons</h3>
            <div className="flex flex-wrap gap-2">
              <Button>Default</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="link">Link</Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Badges</h3>
            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Status pills (fixed colors)
            </h3>
            <div className="flex flex-wrap gap-2">
              <StatusPill status="present" />
              <StatusPill status="late" />
              <StatusPill status="absent" />
              <StatusPill status="idle" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="demo-name">Student name</Label>
              <Input id="demo-name" placeholder="Juan Dela Cruz" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="demo-grade">Grade level</Label>
              <Select>
                <SelectTrigger id="demo-grade" className="w-full">
                  <SelectValue placeholder="Choose a grade" />
                </SelectTrigger>
                <SelectContent>
                  {[7, 8, 9, 10, 11, 12].map((grade) => (
                    <SelectItem key={grade} value={String(grade)}>
                      Grade {grade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Open dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Replace card</DialogTitle>
                  <DialogDescription>
                    This marks the old card as lost and links a new one. This is a Step 6
                    placeholder — the real flow arrives in Step 16.
                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">Open sheet</Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Add student</SheetTitle>
                  <SheetDescription>
                    A Step 6 placeholder — the real form arrives in Step 15.
                  </SheetDescription>
                </SheetHeader>
              </SheetContent>
            </Sheet>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Open menu</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Edit</DropdownMenuItem>
                <DropdownMenuItem>Replace card</DropdownMenuItem>
                <DropdownMenuItem variant="destructive">Remove</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <ToastDemoButton />
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Table</h3>
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Juan Dela Cruz</TableCell>
                    <TableCell>Grade 9 — Rizal</TableCell>
                    <TableCell>
                      <StatusPill status="present" />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Maria Santos</TableCell>
                    <TableCell>Grade 9 — Rizal</TableCell>
                    <TableCell>
                      <StatusPill status="late" />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Skeleton</h3>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Empty state</h3>
            <EmptyState
              icon={UsersRound}
              title="No students yet"
              description="Add your first student to start recording attendance."
            />
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-muted-foreground">Page header</h3>
            <div className="rounded-lg border border-border p-4">
              <PageHeader
                title="Students"
                description="Everyone enrolled at this school."
                actions={<Button size="sm">Add student</Button>}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
