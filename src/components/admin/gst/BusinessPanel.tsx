"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { css } from "styled-system/css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { send, useGst, shortDate } from "./gst-client";
import { Hint, Notice, Section, StatusPill, fieldStyle, gridStyle, pageStyle, rowStyle } from "./gst-ui";

interface Profile {
  legalName: string | null; tradeName: string | null; gstin: string | null; stateCode: string | null; stateName: string | null;
  registeredAddress: string | null; registrationType: string; eInvoicingApplies: boolean | null;
  verificationStatus: string; verifiedBy: string | null; verifiedAt: string | null;
}
interface Config {
  shippingTreatment: string; codTreatment: string; mixedBasketPolicy: string | null; treatmentBasis: string | null;
  treatmentApprovedBy: string | null; stateTableReviewedBy: string | null; placeOfSupplyReviewedBy: string | null;
}

const TREATMENTS = [
  ["UNSET", "Not decided yet"],
  ["NONE", "No GST on it"],
  ["FOLLOWS_GOODS", "Part of the goods: taxed with them"],
  ["SEPARATE", "A separate service, with its own classification"],
] as const;

function Choice({ id, label, value, onChange, options }: { id: string; label: string; value: string; onChange: (v: string) => void; options: ReadonlyArray<readonly [string, string]> }) {
  return (
    <div className={fieldStyle}>
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id}><SelectValue /></SelectTrigger>
        <SelectContent>{options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

export function BusinessPanel() {
  const profile = useGst<{ profile: Profile | null }>("/api/admin/gst/profile");
  const config = useGst<{ config: Config | null }>("/api/admin/gst/config");
  const [form, setForm] = useState({ legalName: "", tradeName: "", gstin: "", registeredAddress: "", registrationType: "REGULAR", einvoice: "unknown" });
  const [verifier, setVerifier] = useState("");
  const [cfg, setCfg] = useState({ shipping: "UNSET", cod: "UNSET", policy: "PROPORTIONAL", basis: "", approvedBy: "", stateReview: "", posReview: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const p = profile.data?.profile;
    if (p) setForm({ legalName: p.legalName ?? "", tradeName: p.tradeName ?? "", gstin: p.gstin ?? "", registeredAddress: p.registeredAddress ?? "", registrationType: p.registrationType, einvoice: p.eInvoicingApplies === null ? "unknown" : p.eInvoicingApplies ? "yes" : "no" });
  }, [profile.data]);
  useEffect(() => {
    const c = config.data?.config;
    if (c) setCfg((s) => ({ ...s, shipping: c.shippingTreatment, cod: c.codTreatment, policy: c.mixedBasketPolicy ?? "PROPORTIONAL", basis: c.treatmentBasis ?? "" }));
  }, [config.data]);

  async function run(work: () => Promise<unknown>, done: string, after: () => void) {
    setBusy(true);
    try { await work(); toast.success(done); after(); } catch (e) { toast.error(e instanceof Error ? e.message : "Could not save"); } finally { setBusy(false); }
  }

  const p = profile.data?.profile;
  const c = config.data?.config;
  const decided = c && c.shippingTreatment !== "UNSET" && c.codTreatment !== "UNSET";

  return (
    <div className={pageStyle}>
      <Notice>
        Nothing here is assumed. Enter the GSTIN exactly as on the registration certificate: the shop&apos;s state is read from its first two digits and the last character is checked, so a typing mistake is caught.
      </Notice>

      <Section title="GST registration" hint="As shown on the registration certificate.">
        <div className={gridStyle}>
          <div className={fieldStyle}><Label htmlFor="legal">Legal name</Label><Input id="legal" value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} /></div>
          <div className={fieldStyle}><Label htmlFor="trade">Trade name (if different)</Label><Input id="trade" value={form.tradeName} onChange={(e) => setForm({ ...form, tradeName: e.target.value })} /></div>
          <div className={fieldStyle}>
            <Label htmlFor="gstin">GSTIN</Label>
            <Input id="gstin" value={form.gstin} maxLength={15} onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })} placeholder="15 characters" />
            <Hint>{p?.stateName ? `State: ${p.stateCode} ${p.stateName}` : "The state appears here once a valid GSTIN is saved."}</Hint>
          </div>
          <Choice id="regtype" label="Registration type" value={form.registrationType} onChange={(v) => setForm({ ...form, registrationType: v })} options={[["REGULAR", "Regular"], ["COMPOSITION", "Composition"], ["UNREGISTERED", "Unregistered"]]} />
          <div className={fieldStyle}><Label htmlFor="addr">Registered address</Label><Textarea id="addr" value={form.registeredAddress} onChange={(e) => setForm({ ...form, registeredAddress: e.target.value })} /></div>
          <Choice id="einv" label="Does e-invoicing apply?" value={form.einvoice} onChange={(v) => setForm({ ...form, einvoice: v })} options={[["unknown", "Not known yet — ask the accountant"], ["no", "No, it does not apply"], ["yes", "Yes, it applies"]]} />
        </div>
        {form.einvoice === "yes" && <Notice tone="warn">E-invoicing applies, but IRN generation is not connected in this system, so GST cannot be enforced. The IRN, acknowledgement number and date can be recorded on an invoice once generated elsewhere.</Notice>}
        <div className={rowStyle}>
          <Button disabled={busy} onClick={() => run(() => send("/api/admin/gst/profile", "PUT", { legalName: form.legalName || null, tradeName: form.tradeName || null, gstin: form.gstin || null, registeredAddress: form.registeredAddress || null, registrationType: form.registrationType, eInvoicingApplies: form.einvoice === "unknown" ? null : form.einvoice === "yes" }), "Registration saved", profile.reload)}>Save registration</Button>
          {p && <StatusPill status={p.verificationStatus} />}
        </div>
      </Section>

      <Section title="Verification" hint="Marking it verified says someone compared these details with the registration certificate. Changing the GSTIN afterwards drops it back to pending and switches the engine OFF.">
        {p?.verificationStatus === "VERIFIED" ? (
          <Hint>Verified by {p.verifiedBy} on {shortDate(p.verifiedAt)}.</Hint>
        ) : (
          <div className={rowStyle}>
            <Input value={verifier} onChange={(e) => setVerifier(e.target.value)} placeholder="Name of who checked it" className={css({ maxWidth: "20rem" })} aria-label="Who checked it" />
            <Button disabled={busy || !verifier.trim() || !p?.gstin} onClick={() => run(() => send("/api/admin/gst/profile", "POST", { action: "verify", verifiedBy: verifier }), "Registration verified", profile.reload)}>Mark verified</Button>
          </div>
        )}
      </Section>

      <Section title="Delivery and cash-on-delivery charges" hint="No official rule specific to these charges was found in the sources read; the general rules (Section 15(2)(c) and Section 8 of the CGST Act) need interpreting. This is the accountant's decision, recorded with their name. GST cannot be enforced until both are decided.">
        {c?.treatmentApprovedBy && <Hint>Decided by {c.treatmentApprovedBy}.</Hint>}
        <div className={gridStyle}>
          <Choice id="ship" label="Delivery charge" value={cfg.shipping} onChange={(v) => setCfg({ ...cfg, shipping: v })} options={TREATMENTS} />
          <Choice id="cod" label="Cash-on-delivery fee" value={cfg.cod} onChange={(v) => setCfg({ ...cfg, cod: v })} options={TREATMENTS} />
          <Choice id="policy" label="When an order has goods at different rates" value={cfg.policy} onChange={(v) => setCfg({ ...cfg, policy: v })} options={[["PROPORTIONAL", "Split the charge by value, each part at its goods' rate"], ["HIGHEST_RATE", "Tax the whole charge at the highest rate"]]} />
          <div className={fieldStyle}><Label htmlFor="acct">Accountant who decided</Label><Input id="acct" value={cfg.approvedBy} onChange={(e) => setCfg({ ...cfg, approvedBy: e.target.value })} /></div>
        </div>
        <div className={fieldStyle}><Label htmlFor="basis">Their reasoning (optional)</Label><Textarea id="basis" value={cfg.basis} onChange={(e) => setCfg({ ...cfg, basis: e.target.value })} /></div>
        <Button disabled={busy || cfg.shipping === "UNSET" || cfg.cod === "UNSET" || !cfg.approvedBy.trim()} onClick={() => run(() => send("/api/admin/gst/config", "PUT", { shippingTreatment: cfg.shipping, codTreatment: cfg.cod, mixedBasketPolicy: cfg.policy, treatmentBasis: cfg.basis || null, approvedBy: cfg.approvedBy }), "Decision recorded", config.reload)} className={css({ alignSelf: "flex-start" })}>Record the decision</Button>
        {decided && <Hint>Currently: delivery — {c!.shippingTreatment.toLowerCase().replace(/_/g, " ")}; cash on delivery — {c!.codTreatment.toLowerCase().replace(/_/g, " ")}.</Hint>}
      </Section>

      <Section title="Reviews the accountant must confirm" hint="Two pieces of reference logic in the system are written from the published rules and have to be confirmed before GST is enforced.">
        <div className={gridStyle}>
          <div className={fieldStyle}>
            <Label htmlFor="states">State-code table checked against the GST portal</Label>
            {c?.stateTableReviewedBy ? <Hint>Reviewed by {c.stateTableReviewedBy}</Hint> : <div className={rowStyle}><Input id="states" value={cfg.stateReview} onChange={(e) => setCfg({ ...cfg, stateReview: e.target.value })} placeholder="Reviewer's name" /><Button variant="outline" disabled={busy || !cfg.stateReview.trim()} onClick={() => run(() => send("/api/admin/gst/config", "PUT", { stateTableReviewedBy: cfg.stateReview }), "Recorded", config.reload)}>Confirm</Button></div>}
          </div>
          <div className={fieldStyle}>
            <Label htmlFor="pos">Place-of-supply rule confirmed (delivered orders: where the goods are delivered; counter: the shop&apos;s state)</Label>
            {c?.placeOfSupplyReviewedBy ? <Hint>Confirmed by {c.placeOfSupplyReviewedBy}</Hint> : <div className={rowStyle}><Input id="pos" value={cfg.posReview} onChange={(e) => setCfg({ ...cfg, posReview: e.target.value })} placeholder="Accountant's name" /><Button variant="outline" disabled={busy || !cfg.posReview.trim()} onClick={() => run(() => send("/api/admin/gst/config", "PUT", { placeOfSupplyReviewedBy: cfg.posReview }), "Recorded", config.reload)}>Confirm</Button></div>}
          </div>
        </div>
      </Section>
    </div>
  );
}
