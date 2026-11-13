/**
 * A return address that is safe to send someone to after they sign in.
 *
 * Only a path on this site qualifies. A `callbackUrl` comes from the address
 * bar, so left unchecked it could send a client who has just typed their
 * password to a look-alike site: "//evil.example" and "https://evil.example"
 * both read as addresses elsewhere, and a backslash is treated as a slash by
 * some browsers.
 */
export function safeLocalPath(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  return value;
}
