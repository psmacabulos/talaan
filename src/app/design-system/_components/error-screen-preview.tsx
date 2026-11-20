"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorScreen } from "@/features/errors/error-screen";

type PreviewState = "succeeds" | "fails" | "updated";

/**
 * The error page (Step 59.1) with a pretend report, so each dialog state can
 * be seen: sending, then sent or failed. "After a deploy" is the version for
 * a page older than the live release (P-062).
 */
export function ErrorScreenPreview() {
  const [state, setState] = useState<PreviewState>("succeeds");

  function pretendToSend() {
    return new Promise<void>((resolve, reject) =>
      setTimeout(() => (state === "fails" ? reject(new Error("Pretend failure")) : resolve()), 1_200),
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <PreviewButton active={state === "succeeds"} onClick={() => setState("succeeds")}>
          Report succeeds
        </PreviewButton>
        <PreviewButton active={state === "fails"} onClick={() => setState("fails")}>
          Report fails
        </PreviewButton>
        <PreviewButton active={state === "updated"} onClick={() => setState("updated")}>
          After a deploy
        </PreviewButton>
      </div>
      <div className="overflow-hidden rounded-lg border border-border">
        {state === "updated" ? (
          <ErrorScreen kind="updated" onRetry={() => undefined} showThemeToggle={false} />
        ) : (
          <ErrorScreen reference="3f9a1c2b" onRetry={() => undefined} onReport={pretendToSend} showThemeToggle={false} />
        )}
      </div>
    </div>
  );
}

function PreviewButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <Button variant={active ? "default" : "outline"} size="sm" aria-pressed={active} onClick={onClick}>
      {children}
    </Button>
  );
}
