"use client";

import { useRef } from "react";
import Image from "next/image";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/** 1 MB — mirrored by createSchoolSchema's logoUrl length cap (schemas.ts). */
export const MAX_LOGO_BYTES = 1_000_000;

/**
 * Step 25's logo picker inside the add-school form. A visually-hidden file
 * input behind a button-styled label; the chosen file is read to a base64
 * data URL with FileReader and handed up through `onChange` — Phase 1 has
 * no real storage, so the logo travels inside the form values and lands on
 * the school record's `logoUrl`, the same approach the prototype's
 * add-school drawer uses. Client-side checks (image type, 1 MB cap) run
 * here and report through `onInvalid`; the server re-checks size via
 * createSchoolSchema.
 */
export function LogoUploader({
  id,
  value,
  onChange,
  onInvalid,
  error,
  describedBy,
}: {
  id: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  onInvalid: (message: string) => void;
  error?: string;
  describedBy?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      onInvalid("Choose an image file (PNG, JPG or similar)");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      onInvalid("That logo is larger than 1 MB — choose a smaller one");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onChange(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function remove() {
    onChange(undefined);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => {
          handleFile(event.target.files?.[0]);
          // Reset so picking the same file again still fires a change event.
          event.target.value = "";
        }}
      />
      <div className="flex items-center gap-3">
        {value ? (
          // The picked file is already a data URL at this point — served
          // as-is by next/image (data: disables optimization on its own).
          <Image
            src={value}
            alt=""
            width={48}
            height={48}
            className="size-12 shrink-0 rounded-lg border border-border bg-card object-contain"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground"
          >
            <ImagePlus className="size-5" />
          </span>
        )}
        <div className="flex min-w-0 flex-col gap-1.5">
          <Button asChild variant="outline" size="sm" className="w-fit">
            <label htmlFor={id}>{value ? "Replace logo" : "Upload logo"}</label>
          </Button>
          {value ? (
            <Button type="button" variant="link" size="sm" onClick={remove} className="h-auto w-fit p-0">
              <X className="size-3.5" aria-hidden="true" />
              Remove
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">PNG or JPG, 1 MB or smaller</p>
          )}
        </div>
      </div>
      {error ? (
        <p id={describedBy} className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
