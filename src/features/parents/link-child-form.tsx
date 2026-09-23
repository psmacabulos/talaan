"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { linkChild } from "./auth-actions";
import { linkChildSchema } from "./auth-schemas";
import type { LinkChildInput } from "./types";

/**
 * Step 22's "link a child" — the same three details CLAUDE.md's domain
 * rules describe (LRN, last name, birth date). On success this routes to
 * the parent home page itself rather than the server action doing a
 * `redirect`, so the success toast (naming the linked child) has a chance
 * to actually show before navigating away.
 */
export function LinkChildForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LinkChildInput>({
    resolver: zodResolver(linkChildSchema),
    defaultValues: { lrn: "", lastName: "", birthDate: "" },
  });

  const busy = isPending || isSubmitting;

  function onSubmit(data: LinkChildInput) {
    startTransition(async () => {
      const result = await linkChild(data);

      if (result.ok) {
        toast(`${result.studentName} is now linked to your account`);
        router.push("/parent");
        return;
      }

      if (result.fieldErrors) {
        for (const [field, message] of Object.entries(result.fieldErrors) as [keyof LinkChildInput, string][]) {
          setError(field, { message });
        }
      }
      if (result.formError) {
        toast.error(result.formError);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="link-child-lrn">LRN</Label>
        <Input
          id="link-child-lrn"
          inputMode="numeric"
          maxLength={12}
          placeholder="100000000123"
          aria-invalid={errors.lrn ? true : undefined}
          aria-describedby={errors.lrn ? "link-child-lrn-error" : undefined}
          {...register("lrn")}
        />
        {errors.lrn && (
          <p id="link-child-lrn-error" className="text-sm text-destructive">
            {errors.lrn.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="link-child-last-name">Last name</Label>
        <Input
          id="link-child-last-name"
          aria-invalid={errors.lastName ? true : undefined}
          aria-describedby={errors.lastName ? "link-child-last-name-error" : undefined}
          {...register("lastName")}
        />
        {errors.lastName && (
          <p id="link-child-last-name-error" className="text-sm text-destructive">
            {errors.lastName.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="link-child-birth-date">Birth date</Label>
        <Input
          id="link-child-birth-date"
          type="date"
          aria-invalid={errors.birthDate ? true : undefined}
          aria-describedby={errors.birthDate ? "link-child-birth-date-error" : undefined}
          {...register("birthDate")}
        />
        {errors.birthDate && (
          <p id="link-child-birth-date-error" className="text-sm text-destructive">
            {errors.birthDate.message}
          </p>
        )}
      </div>

      <Button type="submit" size="lg" disabled={busy} className="mt-2 w-full">
        {busy ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Linking…
          </>
        ) : (
          "Link this child"
        )}
      </Button>
    </form>
  );
}
