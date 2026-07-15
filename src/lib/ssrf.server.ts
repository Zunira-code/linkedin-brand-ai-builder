/**
 * SSRF-safe fetch guard. Validates a user-supplied URL and rejects
 * non-http(s) schemes, private/loopback/link-local IP literals, and
 * hostnames that resolve to internal-only namespaces.
 *
 * Note: Cloudflare Workers has no `dns` module, so we can't resolve
 * hostnames to IPs at runtime — we validate the URL string itself and
 * rely on Workers' outbound network policy for defense in depth.
 */
export function assertPublicUrl(input: string): URL {
  let u: URL;
  try {
    u = new URL(input);
  } catch {
    throw new Error("Invalid URL");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("Only http(s) URLs are allowed");
  }
  const host = u.hostname.toLowerCase();
  if (!host) throw new Error("Invalid URL host");

  // Block localhost and internal namespaces.
  const blockedHosts = new Set([
    "localhost",
    "ip6-localhost",
    "ip6-loopback",
    "metadata.google.internal",
    "metadata.goog",
  ]);
  if (blockedHosts.has(host)) throw new Error("Host not allowed");
  if (
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".lan")
  ) {
    throw new Error("Host not allowed");
  }

  // Bracketed IPv6 literal → strip brackets for classification.
  const ipv6 = host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : null;
  const literal = ipv6 ?? host;

  // IPv4 literal check.
  const v4 = literal.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const [a, b, c, d] = v4.slice(1).map(Number);
    if (![a, b, c, d].every((n) => n >= 0 && n <= 255)) throw new Error("Invalid IPv4");
    // 0.0.0.0/8, 10.0.0.0/8, 127.0.0.0/8, 169.254.0.0/16, 172.16.0.0/12,
    // 192.168.0.0/16, 100.64.0.0/10 (CGNAT), 224.0.0.0/4 (multicast),
    // 240.0.0.0/4 (reserved), 255.255.255.255 (broadcast).
    if (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224
    ) {
      throw new Error("Private/reserved IP not allowed");
    }
  } else if (/:/.test(literal)) {
    // IPv6: block loopback, unspecified, link-local, unique-local, multicast,
    // and IPv4-mapped private ranges.
    const lower = literal.toLowerCase();
    if (
      lower === "::" ||
      lower === "::1" ||
      lower.startsWith("fe80:") ||
      lower.startsWith("fc") ||
      lower.startsWith("fd") ||
      lower.startsWith("ff") ||
      lower.startsWith("::ffff:")
    ) {
      throw new Error("Private/reserved IPv6 not allowed");
    }
  }

  return u;
}

/** fetch wrapper that first validates the URL via {@link assertPublicUrl}. */
export async function safeFetch(url: string, init?: RequestInit): Promise<Response> {
  const validated = assertPublicUrl(url);
  return fetch(validated.toString(), { ...init, redirect: "manual" }).then(async (res) => {
    // Manually follow up to 3 redirects, revalidating each hop.
    let current = res;
    let hops = 0;
    while (current.status >= 300 && current.status < 400 && hops < 3) {
      const loc = current.headers.get("location");
      if (!loc) break;
      const next = new URL(loc, validated).toString();
      assertPublicUrl(next);
      current = await fetch(next, { ...init, redirect: "manual" });
      hops++;
    }
    return current;
  });
}