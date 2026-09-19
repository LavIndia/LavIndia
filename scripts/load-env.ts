/**
 * Loads the project's env files for standalone scripts.
 *
 * `tsx` runs a bare Node process, which — unlike Next.js — reads no `.env`
 * files at all. Prisma loads `.env` for its own connection, so a script that
 * only queries the database appears to work while anything else (ImageKit
 * keys, for instance) is silently missing.
 *
 * Import this FIRST, before anything that reads `process.env`.
 *
 * Precedence matches Next.js: `.env.local` wins over `.env`, and a variable
 * already present in the real environment wins over both — so an exported
 * DATABASE_URL still overrides the files, exactly as it does for the app.
 * That is deliberate: the destructive-script guard must see the same value
 * the app would.
 */
import { config } from "dotenv";
import path from "path";

const root = path.resolve(__dirname, "..");

// Loaded lowest-precedence first; dotenv never overwrites a variable that is
// already set, so later calls cannot clobber earlier ones.
config({ path: path.join(root, ".env.local") });
config({ path: path.join(root, ".env") });
