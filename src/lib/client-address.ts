import { isIP } from "node:net";

/** Every address that couldn't be read shares one count, so garbage can't make endless keys. */
export const UNPARSEABLE_ADDRESS = "unparseable";

/** Eight 16-bit groups from an IPv6 address, "::" expanded and an embedded IPv4 tail turned into two groups. */
function ipv6Groups(address: string): number[] | null {
  let text = address;
  const lastColon = text.lastIndexOf(":");
  const tail = text.slice(lastColon + 1);
  if (tail.includes(".")) {
    if (isIP(tail) !== 4) return null;
    const [a, b, c, d] = tail.split(".").map(Number);
    text = `${text.slice(0, lastColon + 1)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const halves = text.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const rest = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - rest.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
  const groups = [...head, ...Array<string>(halves.length === 2 ? missing : 0).fill("0"), ...rest];
  return groups.map((group) => Number.parseInt(group, 16));
}

/** The part of one forwarded-for entry that's the address: no brackets, port or zone. */
function bareAddress(entry: string): string {
  let text = entry.trim().toLowerCase();
  const bracketed = text.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracketed) text = bracketed[1];
  else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(text)) text = text.slice(0, text.lastIndexOf(":"));
  return text.split("%")[0];
}

/**
 * Who a sign-in limit counts against, from the request's `X-Forwarded-For`
 * (Step 53.3): its **last** entry. Heroku's router appends the address that
 * connected to it, so that one can be trusted, while anything before it was
 * sent by the client and can say anything. That only holds while Heroku's
 * router is the last hop: a proxy in front (Cloudflare's orange cloud, for
 * example) would make every parent look like the proxy (docs/DEPLOY.md).
 *
 * The answer is a key: an IPv4 address, or an IPv6 address's /64 (one phone
 * or home network gets a whole /64, so counting single IPv6 addresses would
 * let it make endless keys). IPv4 written as IPv6 (`::ffff:1.2.3.4`) counts
 * as the IPv4. Null for a loopback address or no header at all: those are
 * this computer's own requests (local runs and tests), never a visitor on
 * Heroku, so they aren't limited by address.
 */
export function clientAddressKey(forwardedFor: string | null): string | null {
  const last = forwardedFor?.split(",").at(-1);
  if (!last?.trim()) return null;
  const address = bareAddress(last);

  if (isIP(address) === 4) return address.startsWith("127.") ? null : address;
  if (isIP(address) !== 6) return UNPARSEABLE_ADDRESS;

  const groups = ipv6Groups(address);
  if (!groups || groups.some((group) => Number.isNaN(group))) return UNPARSEABLE_ADDRESS;
  const isMappedIpv4 = groups.slice(0, 5).every((group) => group === 0) && groups[5] === 0xffff;
  if (isMappedIpv4) {
    const ipv4 = [groups[6] >> 8, groups[6] & 0xff, groups[7] >> 8, groups[7] & 0xff].join(".");
    return ipv4.startsWith("127.") ? null : ipv4;
  }
  const isLoopback = groups.slice(0, 7).every((group) => group === 0) && groups[7] === 1;
  if (isLoopback) return null;
  return `${groups
    .slice(0, 4)
    .map((group) => group.toString(16))
    .join(":")}::/64`;
}
