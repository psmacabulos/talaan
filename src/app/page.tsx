import { ThemeToggle } from "@/components/theme-toggle";

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

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center bg-background px-6 py-16 text-foreground sm:px-10">
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
          <div>
            <ThemeToggle />
          </div>
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
      </div>
    </div>
  );
}
