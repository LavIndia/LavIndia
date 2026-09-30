"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { css } from "styled-system/css";
import { chipRow, hint } from "./editor.styles";
import { chosenChip } from "./ProductPicker";

interface Client {
  id: string;
  name: string | null;
  mobile: string | null;
  email: string | null;
}

const label = (c: Client) => c.name || c.mobile || c.email || "Client";
const results = css({ display: "flex", flexDirection: "column", border: "1px solid", borderColor: "border.subtle", borderRadius: "lg" });
const resultRow = css({ display: "flex", justifyContent: "space-between", gap: "3", paddingInline: "3", paddingBlock: "2", fontSize: "sm", textAlign: "left", cursor: "pointer", _hover: { background: "bg.canvas" } });

/**
 * Chooses the clients an offer is for — a VIP list, a few loyal clients.
 * Only signed-in clients can be matched; a walk-in at the counter has no
 * account to recognise.
 */
export function ClientPicker({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<Client[]>([]);
  const [known, setKnown] = useState<Map<string, Client>>(new Map());

  // Names for clients already chosen, when an offer is reopened.
  useEffect(() => {
    const missing = value.filter((id) => !known.has(id));
    if (!missing.length) return;
    fetch(`/api/admin/customers/search?ids=${missing.join(",")}`)
      .then((r) => r.json())
      .then((b: { clients: Client[] }) => setKnown((m) => new Map([...m, ...b.clients.map((c) => [c.id, c] as const)])))
      .catch(() => {});
  }, [value, known]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setFound([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/admin/customers/search?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((b: { clients: Client[] }) => setFound(b.clients))
        .catch(() => {});
    }, 250);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  const shown = found.filter((c) => !value.includes(c.id));
  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
      <Input id="client-search" placeholder="Search clients by name, mobile or email…" value={query} onChange={(e) => setQuery(e.target.value)} />
      {shown.length > 0 && (
        <div className={results}>
          {shown.map((c) => (
            <button
              key={c.id}
              type="button"
              className={resultRow}
              onClick={() => {
                setKnown((m) => new Map(m).set(c.id, c));
                onChange([...value, c.id]);
                setQuery("");
              }}
            >
              <span>{label(c)}</span>
              <span className={hint}>{c.mobile ?? c.email ?? ""}</span>
            </button>
          ))}
        </div>
      )}
      {query.trim().length >= 2 && shown.length === 0 && <p className={hint}>No client found.</p>}
      {value.length > 0 && (
        <div className={chipRow}>
          {value.map((id) => (
            <span key={id} className={chosenChip}>
              {known.has(id) ? label(known.get(id)!) : "…"}
              <button type="button" aria-label="Remove client" className={css({ cursor: "pointer", display: "inline-flex" })} onClick={() => onChange(value.filter((v) => v !== id))}>
                <X className={css({ width: "3.5", height: "3.5" })} />
              </button>
            </span>
          ))}
        </div>
      )}
      <p className={hint}>Only these clients, signed in online or picked at the counter, get the offer.</p>
    </div>
  );
}
