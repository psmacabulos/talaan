"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { removeStudentPhoto, uploadStudentPhoto } from "./photo-actions";
import { resizeToThumbnail } from "./resize-photo";
import { StudentAvatar } from "./student-display";
import type { Student } from "./types";

/**
 * The drawer's Photo section (Step 46.5), for an existing student only,
 * like the ID card box. Saves on its own, not through the student form's
 * Save button. On a phone the file input offers the camera; the photo is
 * cropped and shrunk to a 256×256 thumbnail in the browser before upload.
 */
export function PhotoBox({ student: initialStudent }: { student: Student }) {
  const [student, setStudent] = useState(initialStudent);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    startTransition(async () => {
      let thumbnail: Blob;
      try {
        thumbnail = await resizeToThumbnail(file);
      } catch {
        toast.error("That photo couldn't be used. Try another one.");
        return;
      }
      const formData = new FormData();
      formData.set("photo", thumbnail, "photo");
      const result = await uploadStudentPhoto(student.id, formData);
      if (!result.ok) {
        toast.error(result.formError);
        return;
      }
      setStudent(result.student);
      toast("Photo saved");
    });
  }

  function handleRemove() {
    startTransition(async () => {
      const result = await removeStudentPhoto(student.id);
      setConfirmRemove(false);
      if (!result.ok) {
        toast.error(result.formError);
        return;
      }
      setStudent(result.student);
      toast("Photo removed");
    });
  }

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-3 font-heading text-sm font-semibold text-foreground">Photo</legend>
      <div className="flex flex-col gap-4 rounded-lg border border-border p-4 sm:flex-row sm:items-center">
        <StudentAvatar student={student} className="size-24 text-xl" />
        {confirmRemove ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-foreground">Remove this photo? The gate will show initials instead.</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="destructive" size="sm" disabled={isPending} onClick={handleRemove}>
                {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                Yes, remove photo
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isPending}
                onClick={() => setConfirmRemove(false)}
              >
                Keep photo
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              The guard checks this photo at the gate. It&apos;s stored as a small thumbnail.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={student.photoKey ? "outline" : "default"}
                disabled={isPending}
                onClick={() => fileInput.current?.click()}
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Camera className="size-4" aria-hidden="true" />
                )}
                {student.photoKey ? "Change photo" : "Take or choose a photo"}
              </Button>
              {student.photoKey ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() => setConfirmRemove(true)}
                >
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
        )}
      </div>
    </fieldset>
  );
}
