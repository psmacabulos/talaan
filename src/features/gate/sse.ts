/**
 * One server-sent event, in the text format browsers' EventSource reads:
 * an event name, one line of JSON, and a blank line to end it.
 */
export function formatSseEvent(name: string, data: unknown): string {
  return `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;
}

/** A comment line: ignored by EventSource, but it keeps a quiet connection open (Heroku drops one silent for 55 s). */
export const SSE_KEEP_ALIVE = ": keep-alive\n\n";
