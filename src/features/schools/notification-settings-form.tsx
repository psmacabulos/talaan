"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { updateNotificationPreference } from "./actions";
import type { NotificationPreference } from "./types";

const OPTIONS: { value: NotificationPreference; label: string; description: string }[] = [
  { value: "off", label: "Off", description: "No tap notifications are sent to parents." },
  {
    value: "time_in_only",
    label: "Time in only",
    description: "Notify parents when a student arrives.",
  },
  {
    value: "time_in_and_time_out",
    label: "Time in and time out",
    description: "Notify parents on arrival and on dismissal.",
  },
];

/**
 * Settings > Notifications (Step 21) — a principal or super admin picks one
 * of the school's three notification preferences and saves it to the school
 * record. One enum field, no text input, so React Hook Form would be
 * overkill here; a controlled radio group plus a Save button is enough. The
 * server action re-validates the same enum on its side (CLAUDE.md:
 * "validated on both sides").
 */
export function NotificationSettingsForm({ currentPreference }: { currentPreference: NotificationPreference }) {
  const [value, setValue] = useState<NotificationPreference>(currentPreference);
  const [isPending, startTransition] = useTransition();
  const dirty = value !== currentPreference;

  function handleSave() {
    startTransition(async () => {
      const result = await updateNotificationPreference(value);
      if (result.ok) {
        toast("Notification settings saved.");
      } else if (result.formError) {
        toast.error(result.formError);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <RadioGroup value={value} onValueChange={(next) => setValue(next as NotificationPreference)} className="gap-2">
        {OPTIONS.map((option) => (
          <div key={option.value} className="flex items-start gap-3 rounded-lg border border-border px-4 py-3">
            <RadioGroupItem value={option.value} id={`notification-${option.value}`} className="mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <Label htmlFor={`notification-${option.value}`} className="text-foreground">
                {option.label}
              </Label>
              <p className="text-sm text-muted-foreground">{option.description}</p>
            </div>
          </div>
        ))}
      </RadioGroup>
      <div>
        <Button type="button" onClick={handleSave} disabled={isPending || !dirty}>
          {isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
