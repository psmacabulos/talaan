"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, Loader2, TriangleAlert } from "lucide-react";
import { useId, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addDevice, type AddDeviceResult } from "./actions";
import { DeviceKindIcon } from "./device-art";
import { MonitorQr } from "./monitor-qr";
import { DEVICE_NAME_MAX_LENGTH } from "./names";
import { deviceFormSchema, type DeviceFormInput } from "./schemas";
import type { DeviceKind } from "./types";

type Created = Extract<AddDeviceResult, { ok: true }>;

const COPY: Record<
  DeviceKind,
  { title: string; description: string; example: string; doneTitle: string; doneDescription: string; secretLabel: string }
> = {
  gate: {
    title: "Add gate tablet",
    description: "Give this device a name to identify it.",
    example: "For example: Main gate tablet, Back gate tablet, or Entrance 1.",
    doneTitle: "Gate tablet added",
    doneDescription: "Copy this secret key now. You won't see it again.",
    secretLabel: "Secret key",
  },
  monitor: {
    title: "Add guardhouse monitor",
    description: "Give this device a name to identify it.",
    example: "For example: Guardhouse monitor, Lobby screen, or Gym monitor.",
    doneTitle: "Monitor added",
    doneDescription: "Open this link on the TV or monitor. It stays signed in.",
    secretLabel: "Link",
  },
};

/**
 * Step 59.13's two-step dialog, one for a gate tablet and one for a monitor.
 * Step 1 asks for a name. Step 2 shows the new device's secret, once: the
 * gate's key, or the monitor's link with a QR code. The secret lives only
 * in this component's state, so closing it forgets it for good. Mount it
 * with a new `key` for every open, so each starts at step 1.
 *
 * While the secret is on screen, Escape, a click outside and the corner ×
 * are all ignored: only "Close" ends it, so the one chance to copy it isn't
 * lost by a stray click.
 */
export function AddDeviceDialog({
  kind,
  open,
  onOpenChange,
}: {
  kind: DeviceKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [created, setCreated] = useState<Created | null>(null);
  const words = COPY[kind];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && created) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        showCloseButton={!created}
        onEscapeKeyDown={(event) => created && event.preventDefault()}
        onInteractOutside={(event) => created && event.preventDefault()}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md"
      >
        {created ? (
          <SecretStep created={created} onClose={() => onOpenChange(false)} />
        ) : (
          <NameStep kind={kind} words={words} onCancel={() => onOpenChange(false)} onCreated={setCreated} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function KindBadge({ kind }: { kind: DeviceKind }) {
  return (
    <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/15">
      <DeviceKindIcon kind={kind} className="size-9" />
    </span>
  );
}

function NameStep({
  kind,
  words,
  onCancel,
  onCreated,
}: {
  kind: DeviceKind;
  words: (typeof COPY)[DeviceKind];
  onCancel: () => void;
  onCreated: (created: Created) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const id = useId();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DeviceFormInput>({ resolver: zodResolver(deviceFormSchema), defaultValues: { kind, label: "" } });
  const busy = isPending || isSubmitting;

  function onSubmit(data: DeviceFormInput) {
    startTransition(async () => {
      const result = await addDevice(data);
      if (result.ok) {
        onCreated(result);
        return;
      }
      if (result.fieldError) setError("label", { message: result.fieldError });
      if (result.formError) toast.error(result.formError);
    });
  }

  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5">
      <DialogHeader className="items-center gap-3 text-center">
        <KindBadge kind={kind} />
        <DialogTitle className="text-base">{words.title}</DialogTitle>
        <DialogDescription>{words.description}</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-label`}>Device name</Label>
        <Input
          id={`${id}-label`}
          autoComplete="off"
          maxLength={DEVICE_NAME_MAX_LENGTH + 20}
          aria-invalid={errors.label ? true : undefined}
          aria-describedby={errors.label ? `${hintId} ${errorId}` : hintId}
          {...register("label")}
        />
        <p id={hintId} className="text-xs text-muted-foreground">
          {words.example}
        </p>
        {errors.label ? (
          <p id={errorId} role="alert" className="text-sm text-destructive">
            {errors.label.message}
          </p>
        ) : null}
      </div>

      <DialogFooter className="grid grid-cols-2 gap-2 sm:flex">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          Create device
        </Button>
      </DialogFooter>
    </form>
  );
}

function SecretStep({ created, onClose }: { created: Created; onClose: () => void }) {
  const { kind, label, secret, gatePage } = created;
  const words = COPY[kind];
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      toast(kind === "gate" ? "Key copied" : "Link copied");
    } catch {
      // Some browsers refuse the clipboard; select the text so Ctrl+C or a long press still works.
      inputRef.current?.select();
      toast("Select the text and copy it");
    }
  }

  const steps =
    kind === "gate"
      ? [
          <>
            On the tablet, open <strong className="font-semibold text-foreground">{gatePage.replace(/^https?:\/\//, "")}</strong>
          </>,
          "Paste this key into the setup screen",
          "The tablet will stay signed in until you disable it",
        ]
      : [
          "Open this link on the TV or monitor",
          "Or scan the QR code with the camera of the phone or tablet that will be the monitor",
          "The screen will stay signed in until you disable it",
        ];

  return (
    <div className="grid gap-4">
      <DialogHeader className="items-center gap-3 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-status-present-bg text-status-present">
          <Check className="size-6" aria-hidden="true" />
        </span>
        <DialogTitle className="text-base">{words.doneTitle}</DialogTitle>
        <DialogDescription>
          <span className="font-medium text-foreground">{label}</span>. {words.doneDescription}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-secret`} className="sr-only">
          {words.secretLabel}
        </Label>
        <div className="flex gap-2">
          <Input
            id={`${id}-secret`}
            ref={inputRef}
            readOnly
            value={secret}
            onFocus={(event) => event.currentTarget.select()}
            className="min-w-0 flex-1 font-mono text-xs"
          />
          <Button type="button" onClick={copy} className="shrink-0">
            {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
      </div>

      {kind === "monitor" ? (
        <div className="flex justify-center">
          <MonitorQr link={secret} />
        </div>
      ) : null}

      <div
        role="note"
        className="flex gap-3 rounded-lg bg-status-late-bg px-3 py-2.5 text-sm text-status-late"
      >
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>
          <span className="font-semibold">This is the only time it will be shown.</span> If you lose this{" "}
          {kind === "gate" ? "key" : "link"}, you will need to add a new device.
        </p>
      </div>

      <div>
        <p className="mb-2 font-heading text-sm font-semibold text-foreground">Next steps</p>
        <ol className="flex flex-col gap-2">
          {steps.map((step, index) => (
            <li key={index} className="flex items-start gap-3 text-sm text-muted-foreground">
              <span
                aria-hidden="true"
                className="flex size-5 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground"
              >
                {index + 1}
              </span>
              <span className="min-w-0 wrap-break-word">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <DialogFooter>
        <Button type="button" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </div>
  );
}
