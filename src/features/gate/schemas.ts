import { z } from "zod";

/** What the gate sends for one tap (`POST /api/v1/gate/taps`). */
export const gateTapRequestSchema = z.object({
  /** Made by the gate, so a resent tap is recognised (Step 45). */
  clientTapId: z.uuid(),
  /** Exactly what the reader typed; the server turns it into a serial. */
  cardSerial: z.string().min(1).max(64),
  /** The gate's own clock, with its offset ("Z" or "+08:00"). */
  clientTappedAt: z.iso.datetime({ offset: true }),
});

export type GateTapRequest = z.infer<typeof gateTapRequestSchema>;
