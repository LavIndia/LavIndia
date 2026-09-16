// Lightweight, dependency-free parsing of standard, legally-uncontroversial
// login metadata: IP address, browser/OS/device type from the user agent,
// and coarse city/region/country from platform-provided geo headers (no
// third-party lookup, no GPS, no precise geolocation). This is the same
// class of data almost every login form on the web records for security
// purposes (e.g. "new sign-in from Chrome on Windows, Mumbai, India").

export type DeviceInfo = {
  ipAddress: string | null;
  userAgent: string | null;
  browser: string | null;
  os: string | null;
  deviceType: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
};

function parseBrowser(ua: string): string | null {
  if (/edg\//i.test(ua)) return "Edge";
  if (/opr\//i.test(ua) || /opera/i.test(ua)) return "Opera";
  if (/chrome|crios/i.test(ua)) return "Chrome";
  if (/firefox|fxios/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua)) return "Safari";
  return null;
}

function parseOS(ua: string): string | null {
  if (/windows/i.test(ua)) return "Windows";
  if (/mac os x|macintosh/i.test(ua)) return "macOS";
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/linux/i.test(ua)) return "Linux";
  return null;
}

function parseDeviceType(ua: string): string | null {
  if (/ipad|tablet/i.test(ua)) return "Tablet";
  if (/mobi|iphone|android.*mobile/i.test(ua)) return "Mobile";
  return "Desktop";
}

/** Extracts device/login metadata from a Next.js Request's headers. */
export function getDeviceInfoFromHeaders(headers: Headers): DeviceInfo {
  const userAgent = headers.get("user-agent");

  const forwardedFor = headers.get("x-forwarded-for");
  const ipAddress =
    headers.get("x-real-ip") ||
    (forwardedFor ? forwardedFor.split(",")[0].trim() : null) ||
    headers.get("cf-connecting-ip") ||
    null;

  // Coarse geo, populated by common hosting platforms (Vercel, Cloudflare)
  // at the edge from the request's IP — no external API call needed, and
  // no precise coordinates are ever collected.
  const city =
    headers.get("x-vercel-ip-city") || headers.get("cf-ipcity") || null;
  const region =
    headers.get("x-vercel-ip-country-region") ||
    headers.get("cf-region") ||
    null;
  const country =
    headers.get("x-vercel-ip-country") || headers.get("cf-ipcountry") || null;

  return {
    ipAddress,
    userAgent,
    browser: userAgent ? parseBrowser(userAgent) : null,
    os: userAgent ? parseOS(userAgent) : null,
    deviceType: userAgent ? parseDeviceType(userAgent) : null,
    city: city ? decodeURIComponent(city) : null,
    region,
    country,
  };
}
