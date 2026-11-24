"use client";

/**
 * Talking to the GST admin API from the screens: one fetch that turns a
 * refusal into an Error carrying the server's own words (so "Not ready for
 * ENFORCE: …" reaches the person, not "failed"), and a hook that loads a
 * screen's data and reloads it after a change.
 */
import { useCallback, useEffect, useState } from "react";

export async function gstFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`);
  return body as T;
}

export const send = <T = unknown>(url: string, method: "POST" | "PUT" | "PATCH" | "DELETE", body?: unknown) =>
  gstFetch<T>(url, { method, body: body === undefined ? undefined : JSON.stringify(body) });

export function useGst<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    try {
      setData(await gstFetch<T>(url));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, error, loading, reload };
}

/** Paise as rupees, Indian grouping, two decimals. */
export const rupees = (cents: number | null | undefined) =>
  cents === null || cents === undefined ? "—" : `₹${(cents / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const percent = (bps: number) => `${bps / 100}%`;

export const shortDate = (value: string | Date | null | undefined) =>
  value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
