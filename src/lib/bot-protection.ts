// Bot User-Agents to block (lazy scrapers, headless browsers, libraries)
const BLOCKED_BOT_AGENTS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "anthropic-ai",
  "Claude-Web",
  "CCBot",
  "PerplexityBot",
  "Bytespider",
  "Amazonbot",
  "Applebot-Extended",
  "meta-externalagent",
  "cohere-ai",
  "Diffbot",
  "curl",
  "wget",
  "python-requests",
  "python-urllib",
  "scrapy",
  "java.net.URL",
  "httpx",
  "aiohttp",
  "headless",
  "headlesschrome",
  "phantom",
  "nightmarejs",
  "puppeteer",
];

/**
 * Check if a User-Agent belongs to a blocked bot.
 * Note: This blocks *only* lazy bots. A spoofed UA bypasses this.
 * For real protection, use Cloudflare Bot Fight Mode or Vercel bot protection.
 */
export function isBlockedBot(userAgent: string): boolean {
  if (!userAgent) return false;
  const lowerUA = userAgent.toLowerCase();
  return BLOCKED_BOT_AGENTS.some((bot) => lowerUA.includes(bot.toLowerCase()));
}

// In-memory rate limiter (per IP, last request time)
// For production, use Redis instead
const ipLastRequest = new Map<string, number>();
const IP_RATE_LIMIT_MS = 100; // 10 requests/second max

/**
 * Rate limit by IP address (simple in-memory implementation).
 * Returns true if the request should be allowed.
 */
export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const lastRequest = ipLastRequest.get(ip);

  if (!lastRequest) {
    ipLastRequest.set(ip, now);
    return true;
  }

  if (now - lastRequest >= IP_RATE_LIMIT_MS) {
    ipLastRequest.set(ip, now);
    return true;
  }

  return false;
}

/**
 * Extract client IP from request headers (works behind proxies).
 */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return headers.get("x-real-ip") || "127.0.0.1";
}
