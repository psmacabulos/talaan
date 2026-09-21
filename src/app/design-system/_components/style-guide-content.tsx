import { UsersRound } from "lucide-react";
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

const coreTokens = [
  { label: "Background", className: "bg-background text-foreground border border-border" },
  { label: "Card", className: "bg-card text-card-foreground border border-border" },
  { label: "Primary", className: "bg-primary text-primary-foreground" },
  { label: "Muted", className: "bg-muted text-muted-foreground" },
  { label: "Accent", className: "bg-accent text-accent-foreground" },
  { label: "Highlight", className: "bg-highlight text-highlight-foreground" },
  { label: "Destructive", className: "bg-destructive text-destructive-foreground" },
];

const statusTokens = [
  { label: "Present", className: "bg-status-present-bg text-status-present" },
  { label: "Late", className: "bg-status-late-bg text-status-late" },
  { label: "Absent", className: "bg-status-absent-bg text-status-absent" },
  { label: "Not yet tapped", className: "bg-status-idle-bg text-status-idle" },
];

const radiusTokens = [
  { label: "sm", className: "rounded-sm" },
  { label: "md", className: "rounded-md" },
  { label: "lg", className: "rounded-lg" },
  { label: "xl", className: "rounded-xl" },
];

const shadowTokens = [
  { label: "shadow-sm", className: "shadow-sm" },
  { label: "shadow-md", className: "shadow-md" },
  { label: "shadow-lg", className: "shadow-lg" },
];

const durationTokens = [
  { label: "fast (100ms)", className: "duration-fast" },
  { label: "base (200ms)", className: "duration-base" },
  { label: "slow (300ms)", className: "duration-slow" },
];

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-border pt-8 first:border-t-0 first:pt-0">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-xl font-semibold">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-muted-foreground">{children}</h3>;
}

/**
 * The full style guide: every token category from src/styles/tokens.css and
 * every shared/shadcn component, plus the states that exist for them
 * (disabled, invalid, empty). Rendered once per page load, scoped to
 * whichever preset the query string picks (see page.tsx) — color mode comes
 * from the real ThemeToggle in the top bar, the same as the rest of the app.
 */
export function StyleGuideContent() {
  return (
    <div className="flex flex-col gap-10">
      <Section title="Colors" description="Every named color token, in this preset.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {coreTokens.map((token) => (
            <div
              key={token.label}
              className={`flex h-20 items-end rounded-lg p-3 text-sm font-medium shadow-sm ${token.className}`}
            >
              {token.label}
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Attendance status colors"
        description="Fixed in every theme — these keep the same meaning no matter which preset a school picks."
      >
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
      </Section>

      <Section title="Typography" description="Lexend for headings and numbers, Atkinson Hyperlegible for body text.">
        <div className="flex flex-col gap-2">
          <p className="font-heading text-3xl font-semibold">Heading — text-3xl</p>
          <p className="font-heading text-2xl font-semibold">Heading — text-2xl</p>
          <p className="font-heading text-xl font-semibold">Heading — text-xl</p>
          <p className="font-heading text-lg font-semibold">Heading — text-lg</p>
          <p className="font-body text-base">Body text — text-base. The quick brown fox jumps over the lazy dog.</p>
          <p className="font-body text-sm text-muted-foreground">Small / muted text — text-sm</p>
          <p className="font-body text-xs text-muted-foreground">Extra-small text — text-xs</p>
          <p className="font-body text-sm">
            A link looks like{" "}
            <a href="#" className="text-link underline">
              this
            </a>
            .
          </p>
        </div>
      </Section>

      <Section title="Radius scale">
        <div className="flex flex-wrap gap-4">
          {radiusTokens.map((token) => (
            <div
              key={token.label}
              className={`flex size-20 items-center justify-center border border-border bg-card text-sm ${token.className}`}
            >
              {token.label}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Elevation">
        <div className="flex flex-wrap gap-4">
          {shadowTokens.map((token) => (
            <div
              key={token.label}
              className={`rounded-lg border border-border bg-card p-4 text-sm ${token.className}`}
            >
              {token.label}
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Motion"
        description="Hover each box to feel its transition speed. Respects prefers-reduced-motion automatically."
      >
        <div className="flex flex-wrap gap-4">
          {durationTokens.map((token) => (
            <div
              key={token.label}
              className={`rounded-lg border border-border bg-card p-4 text-sm transition-colors ${token.className} hover:bg-accent hover:text-accent-foreground`}
            >
              {token.label}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Buttons">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <SubHeading>Variants</SubHeading>
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
            <SubHeading>Disabled</SubHeading>
            <div className="flex flex-wrap gap-2">
              <Button disabled>Default</Button>
              <Button variant="outline" disabled>
                Outline
              </Button>
              <Button variant="destructive" disabled>
                Destructive
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Focus state: tab to a button to see the focus ring (can&apos;t be shown statically).
          </p>
        </div>
      </Section>

      <Section title="Badges">
        <div className="flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="destructive">Destructive</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </Section>

      <Section title="Status pills" description="Built on the fixed status tokens above, not a themed color.">
        <div className="flex flex-wrap gap-2">
          <StatusPill status="present" />
          <StatusPill status="late" />
          <StatusPill status="absent" />
          <StatusPill status="idle" />
        </div>
      </Section>

      <Section title="Form fields">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ds-name">Student name</Label>
            <Input id="ds-name" placeholder="Juan Dela Cruz" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ds-name-filled">With a value</Label>
            <Input id="ds-name-filled" defaultValue="Maria Santos" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ds-name-disabled">Disabled</Label>
            <Input id="ds-name-disabled" defaultValue="Cannot edit" disabled />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ds-name-invalid">Invalid</Label>
            <Input id="ds-name-invalid" defaultValue="04:A3:5F" aria-invalid />
            <p className="text-xs text-destructive">Enter a full card serial.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ds-grade">Grade level</Label>
            <Select>
              <SelectTrigger id="ds-grade" className="w-full">
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
      </Section>

      <Section title="Overlays" description="Dialog, sheet, dropdown menu and toast — click to see their open state.">
        <div className="flex flex-wrap gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Open dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Replace card</DialogTitle>
                <DialogDescription>
                  This marks the old card as lost and links a new one. The real flow arrives in Step 16.
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
                <SheetDescription>The real form arrives in Step 15.</SheetDescription>
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
      </Section>

      <Section title="Table">
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
      </Section>

      <Section title="Skeleton (loading state)">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </Section>

      <Section title="Empty state">
        <EmptyState
          icon={UsersRound}
          title="No students yet"
          description="Add your first student to start recording attendance."
        />
      </Section>

      <Section title="Page header">
        <div className="rounded-lg border border-border p-4">
          <PageHeader
            title="Students"
            description="Everyone enrolled at this school."
            actions={<Button size="sm">Add student</Button>}
          />
        </div>
      </Section>
    </div>
  );
}
