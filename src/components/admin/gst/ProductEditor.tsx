"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { css } from "styled-system/css";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { send, useGst, rupees } from "./gst-client";
import { ClassificationActions, Trail, type HsnOption, type Mapping, type TrailEvent } from "./ClassificationActions";
import { SupplierDocs, type SupplierDoc } from "./SupplierDocs";
import { Hint, Notice, Section, StatusPill, fieldStyle, gridStyle, rowStyle } from "./gst-ui";

interface Gem { name: string; kind: "STONE" | "PEARL"; origin: string }
interface Detail {
  product: { id: string; name: string; description: string | null; priceCents: number; category: { name: string } };
  profile: { baseMetal: string | null; alloyNotes: string | null; platingType: string; platingMetal: string | null; preciousMetal: string | null; preciousPurity: string | null; preciousWeightMg: number | null; gems: Gem[] | null; isHandmade: boolean | null; supplierName: string | null; supplierHsn: string | null; materialNotes: string | null; confirmedBy: string | null } | null;
  infoStatus: string;
  missing: string[];
  suggestions: { headings: Array<{ code: string; because: string }>; caveats: string[] };
  events: TrailEvent[];
  mappings: Mapping[];
  documents: SupplierDoc[];
}

const PLATING = [["UNKNOWN", "Not known yet"], ["NONE", "No precious metal at all"], ["ELECTROPLATED", "Electroplated"], ["PVD", "PVD coating"], ["CLAD_BONDED", "Bonded or rolled on (clad)"], ["SOLID_PRECIOUS", "The piece itself is precious metal"]] as const;
const ORIGINS = [["UNKNOWN", "Not known yet"], ["NATURAL", "Natural"], ["CULTURED", "Cultured (pearls)"], ["SYNTHETIC", "Synthetic"], ["RECONSTRUCTED", "Reconstructed"], ["GLASS", "Glass"], ["CUBIC_ZIRCONIA", "Cubic zirconia"], ["OTHER", "Other"]] as const;

function Pick({ id, label, value, onChange, options }: { id: string; label: string; value: string; onChange: (v: string) => void; options: ReadonlyArray<readonly [string, string]> }) {
  return (
    <div className={fieldStyle}>
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}><SelectTrigger id={id}><SelectValue /></SelectTrigger><SelectContent>{options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>
    </div>
  );
}

/**
 * One piece: what it is made of, what is still missing, what is suggested and
 * decided. Everything starts empty — nothing is inferred from the name.
 */
export function ProductEditor({ productId, hsn, onClose, onChanged }: { productId: string | null; hsn: HsnOption[]; onClose: () => void; onChanged: () => void }) {
  const { data, reload } = useGst<Detail>(productId ? `/api/admin/gst/products/${productId}` : null);
  const [f, setF] = useState({ baseMetal: "", alloyNotes: "", platingType: "UNKNOWN", platingMetal: "", preciousMetal: "", preciousPurity: "", weight: "", handmade: "unknown", supplierName: "", supplierHsn: "", notes: "", confirmedBy: "" });
  const [gems, setGems] = useState<Gem[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const p = data?.profile;
    setF({ baseMetal: p?.baseMetal ?? "", alloyNotes: p?.alloyNotes ?? "", platingType: p?.platingType ?? "UNKNOWN", platingMetal: p?.platingMetal ?? "", preciousMetal: p?.preciousMetal ?? "", preciousPurity: p?.preciousPurity ?? "", weight: p?.preciousWeightMg?.toString() ?? "", handmade: p?.isHandmade == null ? "unknown" : p.isHandmade ? "yes" : "no", supplierName: p?.supplierName ?? "", supplierHsn: p?.supplierHsn ?? "", notes: p?.materialNotes ?? "", confirmedBy: p?.confirmedBy ?? "" });
    setGems(Array.isArray(p?.gems) ? (p!.gems as Gem[]) : null);
  }, [data]);

  async function save() {
    setBusy(true);
    try {
      await send(`/api/admin/gst/products/${productId}`, "PUT", {
        baseMetal: f.baseMetal || null, alloyNotes: f.alloyNotes || null, platingType: f.platingType, platingMetal: f.platingMetal || null, preciousMetal: f.preciousMetal || null, preciousPurity: f.preciousPurity || null,
        preciousWeightMg: f.weight ? Number(f.weight) : null, gems, isHandmade: f.handmade === "unknown" ? null : f.handmade === "yes",
        supplierName: f.supplierName || null, supplierHsn: f.supplierHsn || null, materialNotes: f.notes || null, confirmedBy: f.confirmedBy || null,
      });
      toast.success("Saved");
      await reload();
      onChanged();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not save"); } finally { setBusy(false); }
  }

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const refresh = () => { void reload(); onChanged(); };

  return (
    <Sheet open={!!productId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className={css({ maxWidth: "40rem", overflowY: "auto" })}>
        <SheetHeader>
          <SheetTitle>{data?.product.name ?? "…"}</SheetTitle>
          <SheetDescription>{data ? `${data.product.category.name} · ${rupees(data.product.priceCents)}` : ""}</SheetDescription>
        </SheetHeader>
        {data && (
          <div className={css({ display: "flex", flexDirection: "column", gap: "5", paddingBottom: "8" })}>
            {data.product.description && <Hint>{data.product.description}</Hint>}
            <Notice>The description is shown for reference only. It does not say what the piece is made of, and nothing is filled in from it.</Notice>

            <Section title="What it is made of" actions={<StatusPill status={data.infoStatus} />}>
              {data.missing.length > 0 && <ul className={css({ fontSize: "sm", color: "fg.muted", paddingLeft: "5", listStyle: "disc" })}>{data.missing.map((m) => <li key={m}>{m}</li>)}</ul>}
              <div className={gridStyle}>
                <div className={fieldStyle}><Label htmlFor="pe-metal">Base metal or alloy</Label><Input id="pe-metal" value={f.baseMetal} onChange={set("baseMetal")} placeholder="e.g. brass, stainless steel, silver 925" /></div>
                <Pick id="pe-plating" label="Precious metal in the piece" value={f.platingType} onChange={(v) => setF({ ...f, platingType: v })} options={PLATING} />
                {["ELECTROPLATED", "PVD", "CLAD_BONDED"].includes(f.platingType) && <div className={fieldStyle}><Label htmlFor="pe-pm">Plated or clad with</Label><Input id="pe-pm" value={f.platingMetal} onChange={set("platingMetal")} placeholder="e.g. gold" /></div>}
                {["SOLID_PRECIOUS", "CLAD_BONDED"].includes(f.platingType) && <><div className={fieldStyle}><Label htmlFor="pe-prec">Precious metal</Label><Input id="pe-prec" value={f.preciousMetal} onChange={set("preciousMetal")} /></div><div className={fieldStyle}><Label htmlFor="pe-pur">Purity</Label><Input id="pe-pur" value={f.preciousPurity} onChange={set("preciousPurity")} placeholder="e.g. 22K, 925" /></div><div className={fieldStyle}><Label htmlFor="pe-wt">Precious metal weight (mg)</Label><Input id="pe-wt" inputMode="numeric" value={f.weight} onChange={set("weight")} /></div></>}
                <Pick id="pe-hand" label="Handmade?" value={f.handmade} onChange={(v) => setF({ ...f, handmade: v })} options={[["unknown", "Not stated"], ["yes", "Yes"], ["no", "No"]]} />
              </div>

              <div className={fieldStyle}>
                <Label>Stones and pearls</Label>
                {gems === null ? (
                  <div className={rowStyle}><Hint>Not answered yet.</Hint><Button variant="outline" size="sm" onClick={() => setGems([])}>There are none</Button><Button variant="outline" size="sm" onClick={() => setGems([{ name: "", kind: "STONE", origin: "UNKNOWN" }])}>Add one</Button></div>
                ) : (
                  <>
                    {gems.length === 0 && <Hint>Confirmed: no stones or pearls.</Hint>}
                    {gems.map((g, i) => (
                      <div key={i} className={css({ display: "grid", gridTemplateColumns: { base: "1fr", md: "1fr 8rem 1fr auto" }, gap: "2", alignItems: "end" })}>
                        <Input aria-label="Name" placeholder="Name, e.g. opal" value={g.name} onChange={(e) => setGems(gems.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                        <Pick id={`gk-${i}`} label="Kind" value={g.kind} onChange={(v) => setGems(gems.map((x, j) => (j === i ? { ...x, kind: v as Gem["kind"] } : x)))} options={[["STONE", "Stone"], ["PEARL", "Pearl"]]} />
                        <Pick id={`go-${i}`} label="Origin" value={g.origin} onChange={(v) => setGems(gems.map((x, j) => (j === i ? { ...x, origin: v } : x)))} options={ORIGINS} />
                        <Button variant="ghost" size="icon" aria-label="Remove" onClick={() => setGems(gems.filter((_, j) => j !== i))}><X className={css({ height: "4", width: "4" })} /></Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className={css({ alignSelf: "flex-start" })} onClick={() => setGems([...gems, { name: "", kind: "STONE", origin: "UNKNOWN" }])}><Plus className={css({ height: "4", width: "4" })} />Add stone or pearl</Button>
                  </>
                )}
              </div>

              <div className={gridStyle}>
                <div className={fieldStyle}><Label htmlFor="pe-sup">Supplier</Label><Input id="pe-sup" value={f.supplierName} onChange={set("supplierName")} /></div>
                <div className={fieldStyle}><Label htmlFor="pe-shsn">HSN printed on the supplier&apos;s invoice</Label><Input id="pe-shsn" inputMode="numeric" value={f.supplierHsn} onChange={set("supplierHsn")} /><Hint>A hint about how they classified it. Not a classification.</Hint></div>
              </div>
              <div className={fieldStyle}><Label htmlFor="pe-notes">Notes</Label><Textarea id="pe-notes" value={f.notes} onChange={set("notes")} /></div>
              <div className={fieldStyle}><Label htmlFor="pe-conf">Confirmed by</Label><Input id="pe-conf" value={f.confirmedBy} onChange={set("confirmedBy")} placeholder="Your name, to say these details are right" /><Hint>Changing any detail later clears this and sends an approved classification back for review.</Hint></div>
              <Button onClick={save} disabled={busy} className={css({ alignSelf: "flex-start" })}>Save details</Button>
            </Section>

            <Section title="Suggested heading" hint="A starting point for the accountant, from the details above. Never a classification.">
              {data.suggestions.headings.length === 0 ? <Hint>Nothing can be suggested yet.</Hint> : data.suggestions.headings.map((h) => <div key={h.code}><strong>{h.code}</strong> <span className={css({ color: "fg.muted", fontSize: "sm" })}>— {h.because}</span></div>)}
              {data.suggestions.caveats.map((c) => <Hint key={c}>{c}</Hint>)}
            </Section>

            <Section title="Classification">
              <ClassificationActions productId={data.product.id} mappings={data.mappings} hsn={hsn} suggested={data.suggestions.headings.map((h) => h.code)} complete={data.infoStatus === "COMPLETE"} onChanged={refresh} />
            </Section>

            <Section title="Supplier papers"><SupplierDocs productId={data.product.id} documents={data.documents} onChanged={refresh} /></Section>
            <Section title="Who did what"><Trail events={data.events} /></Section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
