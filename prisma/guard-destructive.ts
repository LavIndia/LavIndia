/**
 * Refuses to let a destructive script run against anything but a local
 * database.
 *
 * This exists because `prisma/seed.ts` begins by deleting every product,
 * category, variant, image and ORDER, and because `prisma migrate reset`
 * runs that seed automatically. A single command issued from a shell that
 * still holds a production DATABASE_URL in its environment is enough to
 * empty a live catalog — and a process environment variable silently
 * overrides whatever `.env` says, so the files looking correct proves
 * nothing.
 *
 * The guard therefore inspects the URL the script is ACTUALLY about to use,
 * and fails closed.
 */

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0", "host.docker.internal"]);

/** Explicit, deliberately awkward opt-out for the rare intentional case. */
const OVERRIDE_ENV = "I_UNDERSTAND_THIS_DELETES_DATA";
const OVERRIDE_VALUE = "yes-wipe-this-database";

function describe(url: string): { host: string; database: string; safe: string } {
  const parsed = new URL(url);
  const host = parsed.hostname;
  return {
    host,
    database: parsed.pathname.replace(/^\//, "") || "(none)",
    // Never print credentials, not even into a local terminal log.
    safe: `${parsed.protocol}//${host}:${parsed.port || "5432"}${parsed.pathname}`,
  };
}

/**
 * Call this as the FIRST statement of any script that deletes or overwrites
 * data. Throws — and so aborts the script — unless the target is local.
 */
export function assertLocalDatabase(scriptName: string): void {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error(`${scriptName}: DATABASE_URL is not set. Refusing to run.`);
  }

  let info: ReturnType<typeof describe>;
  try {
    info = describe(url);
  } catch {
    throw new Error(`${scriptName}: DATABASE_URL is not a valid URL. Refusing to run.`);
  }

  const isLocal = LOCAL_HOSTS.has(info.host);
  const overridden = process.env[OVERRIDE_ENV] === OVERRIDE_VALUE;

  if (isLocal) {
    console.log(`${scriptName}: target ${info.safe} — local, proceeding.`);
    return;
  }

  if (overridden) {
    console.warn(
      `${scriptName}: target ${info.safe} is NOT local, but ${OVERRIDE_ENV} is set. Proceeding.`,
    );
    return;
  }

  throw new Error(
    [
      "",
      "=========================================================",
      ` REFUSING TO RUN: ${scriptName}`,
      "=========================================================",
      "",
      ` This script DELETES products, categories, variants,`,
      ` images and orders before it writes anything.`,
      "",
      ` It resolved to a NON-LOCAL database:`,
      ``,
      `     ${info.safe}`,
      ``,
      ` Nothing has been changed.`,
      "",
      " Note that a DATABASE_URL exported in your shell overrides",
      " the .env files, so check the shell too:",
      "",
      "     PowerShell:  echo $env:DATABASE_URL",
      "     bash:        echo $DATABASE_URL",
      "",
      " If you genuinely intend to wipe the database above, set:",
      "",
      `     ${OVERRIDE_ENV}=${OVERRIDE_VALUE}`,
      "",
      "=========================================================",
    ].join("\n"),
  );
}
