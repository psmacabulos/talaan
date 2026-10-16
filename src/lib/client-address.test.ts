import { describe, expect, it } from "vitest";
import { clientAddressKey, UNPARSEABLE_ADDRESS } from "./client-address";

describe("clientAddressKey", () => {
  it("trusts only the last entry, the one Heroku's router added", () => {
    expect(clientAddressKey("1.1.1.1, 203.0.113.7")).toBe("203.0.113.7");
    expect(clientAddressKey("203.0.113.7")).toBe("203.0.113.7");
  });

  it("strips spaces, ports, brackets and zones", () => {
    expect(clientAddressKey("  203.0.113.7:51234 ")).toBe("203.0.113.7");
    expect(clientAddressKey("[2001:DB8:1:2::9]:443")).toBe("2001:db8:1:2::/64");
    expect(clientAddressKey("fe80::1%eth0")).toBe("fe80:0:0:0::/64");
  });

  it("counts an IPv6 address by its /64, expanding :: first", () => {
    expect(clientAddressKey("2001:db8::1")).toBe("2001:db8:0:0::/64");
    expect(clientAddressKey("2001:db8:aaaa:bbbb:1:2:3:4")).toBe("2001:db8:aaaa:bbbb::/64");
    expect(clientAddressKey("2001:db8:aaaa:bbbb:ffff::")).toBe("2001:db8:aaaa:bbbb::/64");
  });

  it("treats IPv4 written as IPv6 as the IPv4", () => {
    expect(clientAddressKey("::ffff:203.0.113.7")).toBe("203.0.113.7");
    expect(clientAddressKey("::ffff:cb00:7107")).toBe("203.0.113.7");
  });

  it.each(["::1", "127.0.0.1", "127.8.9.10", "::ffff:127.0.0.1", "0:0:0:0:0:0:0:1"])(
    "doesn't limit this computer's own address %s",
    (address) => {
      expect(clientAddressKey(address)).toBeNull();
    },
  );

  it("doesn't limit a request with no header", () => {
    expect(clientAddressKey(null)).toBeNull();
    expect(clientAddressKey(" ")).toBeNull();
  });

  it.each(["not an address", "999.1.1.1", "1::2::3", "2001:db8::1:2:3:4:5:6:7"])(
    "puts %s in the one shared bucket",
    (address) => {
      expect(clientAddressKey(address)).toBe(UNPARSEABLE_ADDRESS);
    },
  );
});
