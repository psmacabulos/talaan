import { cn } from "@/lib/utils";

/** The notice's paragraphs: split on a blank line, which may hold spaces or tabs. */
export function paragraphsOf(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}

/**
 * A privacy notice as people read it (Step 60.4; the parent pages in 60.5).
 * Plain text only: React shows any `<` or `&` as typed, so nothing in a
 * notice can run in a reader's browser. Inside a paragraph, line breaks and
 * spacing stay as written, and a long word or address wraps instead of
 * widening the page.
 */
export function NoticeText({ body, className }: { body: string; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3 text-sm text-foreground", className)}>
      {paragraphsOf(body).map((paragraph, index) => (
        <p key={index} className="break-words whitespace-pre-wrap">
          {paragraph}
        </p>
      ))}
    </div>
  );
}
