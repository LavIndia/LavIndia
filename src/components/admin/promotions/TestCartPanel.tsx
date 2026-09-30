"use client";

import { useState } from "react";
import { Loader2, Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { css } from "styled-system/css";
import { formatPaisa } from "@/modules/_shared/money";
import { matchesFilter } from "@/modules/promotions/engine/units";
import type { PieceFilter } from "@/modules/promotions/contracts";
import { chipRow, hint, pill } from "./editor.styles";
import { type Draft, toPayload } from "./promotion-draft";

export interface TestPiece {
  variantId: string;
  productId: string;
  label: string;
  categoryId: string;
  collectionIds: string[];
  material: string | null;
  color: string | null;
  size: string | null;
  tags: string[];
  priceCents: number;
}

interface PreviewLine {
  name: string;
  variantName: string | null;
  quantity: number;
  catalogPriceCents: number;
  priceCents: number;
  discountCents: number;
  taxCents: number;
  lineTotalCents: number;
  marginCents: number | null;
  offers: string[];
}
interface Preview {
  lines: PreviewLine[];
  totals: { subtotalCents: number; discountCents: number; taxCents: number; taxIncluded: boolean; grandTotalCents: number; shippingCents: number };
  applied: Array<{ promotionId: string; label: string; savingCents: number }>;
  rejected: Array<{ promotionId: string; label: string; reason: string; shortfallCents?: number }>;
  draftApplied: boolean;
}

const REASON: Record<string, string> = {
  NOT_QUALIFIED: "this cart doesn't qualify",
  SAVES_LESS: "another offer saves more",
  NOT_COMBINABLE: "can't be combined with the offer that applied",
  EXCLUSIVE_ELSEWHERE: "an exclusive offer applied",
  CODE_NOT_ENTERED: "needs its code",
};

const row = css({ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: "2", fontSize: "sm", paddingBlock: "1.5", borderBottom: "1px solid", borderColor: "border.subtle" });
const num = css({ fontVariantNumeric: "tabular-nums", textAlign: "right", whiteSpace: "nowrap" });
const small = css({ width: "4", height: "4" });

function asLine(p: TestPiece) {
  return { lineId: p.variantId, variantId: p.variantId, productId: p.productId, categoryId: p.categoryId, collectionIds: p.collectionIds, material: p.material, color: p.color, size: p.size, tags: p.tags, unitPriceCents: p.priceCents, quantity: 1 };
}

/**
 * A sample cart priced exactly as checkout and the counter would price it,
 * with this offer as it stands — so an owner sees the real result before
 * any client does.
 */
export function TestCartPanel({ draft, pieces, selfId }: { draft: Draft; pieces: TestPiece[]; selfId?: string }) {
  const [cart, setCart] = useState<Array<{ piece: TestPiece; quantity: number }>>([]);
  const [query, setQuery] = useState("");
  const [channel, setChannel] = useState<"ONLINE" | "STORE">(draft.channels[0] ?? "ONLINE");
  const [includeLive, setIncludeLive] = useState(true);
  // Empty means "now". A date lets the owner check a scheduled offer, or an
  // evening-hours one, before the day comes.
  const [at, setAt] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const found = query.trim() ? pieces.filter((p) => p.label.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6) : [];
  const add = (piece: TestPiece) =>
    setCart((c) => (c.some((x) => x.piece.variantId === piece.variantId) ? c.map((x) => (x.piece.variantId === piece.variantId ? { ...x, quantity: x.quantity + 1 } : x)) : [...c, { piece, quantity: 1 }]));
  const fill = () => {
    // Sets are resolved on the server, so the sample is drawn from the whole
    // catalog when the offer uses them; the server prices it exactly.
    const filter: PieceFilter =
      draft.benefit.type === "bundle" || draft.pieces.setIds?.length ? { include: [], exclude: [] } : draft.pieces;
    const matching = pieces.filter((p) => matchesFilter(asLine(p), filter)).sort((a, b) => a.priceCents - b.priceCents);
    const pick = [...matching.slice(0, 2), ...matching.slice(-2)].filter((p, i, all) => all.indexOf(p) === i);
    setCart(pick.map((piece) => ({ piece, quantity: 1 })));
    setPreview(null);
  };

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/promotions/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: toPayload(draft),
          selfId,
          channel,
          includeLive,
          at: at ? new Date(at).toISOString() : undefined,
          lines: cart.map((c) => ({ variantId: c.piece.variantId, quantity: c.quantity })),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not price this cart");
      setPreview(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not price this cart");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "3" })}>
      <div className={chipRow}>
        {(["ONLINE", "STORE"] as const).map((c) => (
          <button key={c} type="button" className={pill(channel === c)} aria-pressed={channel === c} onClick={() => setChannel(c)}>
            {c === "ONLINE" ? "Online" : "In store"}
          </button>
        ))}
      </div>
      <div className={css({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "3" })}>
        <Label htmlFor="test-live">Include offers already live</Label>
        <Switch id="test-live" checked={includeLive} onCheckedChange={setIncludeLive} />
      </div>
      <div className={css({ display: "flex", flexDirection: "column", gap: "1" })}>
        <Label htmlFor="test-at">Test as if it were</Label>
        <Input id="test-at" type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />
        <span className={hint}>{at ? "Priced at that date and time." : "Empty means right now."}</span>
      </div>
      <Input id="test-search" placeholder="Add a piece…" value={query} onChange={(e) => setQuery(e.target.value)} />
      {found.map((p) => (
        <button key={p.variantId} type="button" onClick={() => { add(p); setQuery(""); }} className={css({ display: "flex", justifyContent: "space-between", gap: "2", fontSize: "sm", textAlign: "left", cursor: "pointer", paddingBlock: "1", _hover: { color: "accent.default" } })}>
          <span>{p.label}</span>
          <span className={num}>{formatPaisa(p.priceCents)}</span>
        </button>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={fill}>Fill with matching pieces</Button>

      {cart.map(({ piece, quantity }) => (
        <div key={piece.variantId} className={css({ display: "flex", alignItems: "center", gap: "2", fontSize: "sm" })}>
          <span className={css({ flex: 1, minWidth: 0 })}>{piece.label}</span>
          <Button type="button" variant="ghost" size="icon" aria-label="One fewer" onClick={() => setCart((c) => c.map((x) => (x.piece === piece ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x)))}><Minus className={small} /></Button>
          <span className={num}>{quantity}</span>
          <Button type="button" variant="ghost" size="icon" aria-label="One more" onClick={() => add(piece)}><Plus className={small} /></Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Remove" onClick={() => setCart((c) => c.filter((x) => x.piece !== piece))}><X className={small} /></Button>
        </div>
      ))}
      <Button type="button" onClick={run} disabled={cart.length === 0 || loading}>
        {loading && <Loader2 className={css({ width: "4", height: "4", animation: "spin" })} />}
        Price this cart
      </Button>
      {error && <p className={css({ fontSize: "sm", color: "danger" })}>{error}</p>}

      {preview && (
        <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
          {preview.lines.map((l, i) => (
            <div key={i} className={row}>
              <div>
                <div>{l.name}{l.quantity > 1 ? ` × ${l.quantity}` : ""}</div>
                <div className={hint}>
                  {formatPaisa(l.catalogPriceCents)} → {formatPaisa(l.priceCents)} each
                  {l.marginCents !== null && ` · margin ${formatPaisa(l.marginCents)}`}
                  {l.offers.length > 0 && ` · ${l.offers.join(", ")}`}
                </div>
              </div>
              <div className={num}>{formatPaisa(l.lineTotalCents)}</div>
            </div>
          ))}
          <div className={row}><span>Subtotal</span><span className={num}>{formatPaisa(preview.totals.subtotalCents)}</span></div>
          {preview.applied.map((a) => (
            <div key={a.promotionId} className={row}><span>{a.label}</span><span className={num} style={{ color: "var(--colors-success)" }}>−{formatPaisa(a.savingCents)}</span></div>
          ))}
          <div className={row}><span>{preview.totals.taxIncluded ? "GST included" : "GST"}</span><span className={num}>{formatPaisa(preview.totals.taxCents)}</span></div>
          <div className={row} style={{ fontWeight: 600 }}><span>Total</span><span className={num}>{formatPaisa(preview.totals.grandTotalCents)}</span></div>
          {!preview.draftApplied && <p className={hint}>This offer did not apply to this cart.</p>}
          {preview.rejected.map((r) => (
            <p key={r.promotionId} className={hint}>
              Not applied: {r.label} — {REASON[r.reason] ?? r.reason}
              {r.shortfallCents ? ` (${formatPaisa(r.shortfallCents)} less)` : ""}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
