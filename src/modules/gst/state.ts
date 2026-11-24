/**
 * The engine's switch and the decisions it depends on, read cheaply.
 *
 * Every priced cart asks "is the GST engine on?", so the answer is held for a
 * few seconds rather than fetched each time. Turning the engine OFF therefore
 * takes effect within `TTL_MS` on every running instance, and immediately on
 * the instance where an admin made the change (the cache is dropped).
 *
 * Failure is safe by construction: if the GST tables cannot be read — not
 * created yet, database hiccup — the mode is OFF and the shop trades exactly
 * as it did before the engine existed.
 */
import { prisma } from "../_shared/db";
import type { GstBusinessProfile, GstConfiguration } from "@prisma/client";

export type EngineMode = "OFF" | "SHADOW" | "ENFORCE";

const TTL_MS = 15_000;

interface Snapshot {
  profile: GstBusinessProfile | null;
  config: GstConfiguration | null;
  at: number;
}

let cached: Snapshot | null = null;

async function load(): Promise<Snapshot> {
  const [profile, config] = await Promise.all([
    prisma.gstBusinessProfile.findFirst(),
    prisma.gstConfiguration.findFirst(),
  ]);
  return { profile, config, at: Date.now() };
}

/** The profile and configuration, or nulls when the GST tables cannot be read. */
export async function gstState(): Promise<Pick<Snapshot, "profile" | "config">> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached;
  try {
    cached = await load();
  } catch {
    cached = { profile: null, config: null, at: Date.now() };
  }
  return cached;
}

export async function engineMode(): Promise<EngineMode> {
  const { profile } = await gstState();
  return profile?.engineMode ?? "OFF";
}

/** Call after changing the profile or configuration so this instance sees it at once. */
export function invalidateGstState(): void {
  cached = null;
}
