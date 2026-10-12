"use client";

import { useRef, useTransition, type ChangeEvent } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { resizeToThumbnail } from "./resize-photo";
import { StudentAvatar } from "./student-display";
import type { Student } from "./types";

/**
 * The drawer's Photo section (Step 46.5). On a phone the file input offers
 * the camera; the photo is cropped and shrunk to a 256×256 thumbnail in the
 * browser. Saves nothing itself (2026-10-12): the new thumbnail, or "remove
 * the photo", is held by the student form and saved by its Save button.
 * Undo, or the form's Cancel, throws it away.
 */
export function PhotoBox({
  name,
  savedPhotoKey,
  pendingPhotoUrl,
  removePhoto,
  onPhotoChosen,
  onRemove,
  onUndo,
}: {
  /** For the initials when there's no photo: the names as typed so far. */
  name: Pick<Student, "firstName" | "lastName">;
  savedPhotoKey: string | undefined;
  /** A preview of the chosen, not yet saved, thumbnail. */
  pendingPhotoUrl: string | null;
  removePhoto: boolean;
  onPhotoChosen: (thumbnail: Blob) => void;
  onRemove: () => void;
  onUndo: () => void;
}) {
  const [isResizing, startResizing] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  const hasPendingChange = pendingPhotoUrl !== null || removePhoto;
  const showsPhoto = pendingPhotoUrl !== null || (Boolean(savedPhotoKey) && !removePhoto);

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    startResizing(async () => {
      try {
        onPhotoChosen(await resizeToThumbnail(file));
      } catch {
        toast.error("That photo couldn't be used. Try another one.");
      }
    });
  }

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-3 font-heading text-sm font-semibold text-foreground">Photo</legend>
      <div className="flex flex-col gap-4 rounded-lg border border-border p-4 sm:flex-row sm:items-center">
        <StudentAvatar
          student={{ ...name, photoKey: removePhoto ? undefined : savedPhotoKey }}
          photoSrc={pendingPhotoUrl ?? undefined}
          className="size-24 text-xl"
        />
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            {pendingPhotoUrl
              ? "New photo. Not saved yet: it's saved when you save the student."
              : removePhoto
                ? "The photo will be removed when you save the student. The gate will show initials instead."
                : "The guard checks this photo at the gate. It's stored as a small thumbnail."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={showsPhoto ? "outline" : "default"}
              disabled={isResizing}
              onClick={() => fileInput.current?.click()}
            >
              {isResizing ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Camera className="size-4" aria-hidden="true" />
              )}
              {showsPhoto ? "Change photo" : "Take or choose a photo"}
            </Button>
            {hasPendingChange ? (
              <Button type="button" variant="ghost" size="sm" disabled={isResizing} onClick={onUndo}>
                Undo
              </Button>
            ) : savedPhotoKey ? (
              <Button type="button" variant="ghost" size="sm" disabled={isResizing} onClick={onRemove}>
                Remove photo
              </Button>
            ) : null}
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            capture="user"
            className="sr-only"
            tabIndex={-1}
            aria-label="Student photo"
            onChange={handleFile}
          />
        </div>
      </div>
    </fieldset>
  );
}
