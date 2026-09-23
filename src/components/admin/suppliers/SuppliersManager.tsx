"use client";

import { useState } from "react";
import { Pencil, Plus, Truck, X } from "lucide-react";
import { toast } from "sonner";
import { css } from "styled-system/css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SupplierView } from "@/modules/purchasing";

/**
 * The supplier list, with an inline editor.
 *
 * Kept on one screen rather than a list plus a separate form page: a
 * supplier is six short fields, and a delivery is usually already half
 * entered when someone realises the vendor is not on the list yet.
 */

const wrapStyle = css({ display: "flex", flexDirection: "column", gap: "4" });
const rowStyle = css({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "3",
  padding: "3.5",
  borderRadius: "lg",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
});
const nameStyle = css({ fontWeight: "medium", color: "fg.default" });
const metaStyle = css({ fontSize: "sm", color: "fg.muted", lineHeight: "1.5" });
const formStyle = css({
  display: "grid",
  gap: "3",
  gridTemplateColumns: { base: "1fr", md: "repeat(2, 1fr)" },
  padding: "4",
  borderRadius: "lg",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.glass",
});
const fieldStyle = css({ display: "flex", flexDirection: "column", gap: "1.5" });
const actionsStyle = css({
  display: "flex",
  gap: "2",
  gridColumn: { base: "auto", md: "1 / -1" },
  justifyContent: "flex-end",
});
const emptyStyle = css({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: "2",
  padding: "8",
  textAlign: "center",
  color: "fg.muted",
  border: "1px dashed",
  borderColor: "border.subtle",
  borderRadius: "lg",
});
const iconStyle = css({ height: "4", width: "4" });

type Draft = {
  id?: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  gstin: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
};

const blank: Draft = {
  name: "", contactName: "", phone: "", email: "", gstin: "",
  address: "", city: "", state: "", pincode: "",
};

function toDraft(supplier: SupplierView): Draft {
  return {
    id: supplier.id,
    name: supplier.name,
    contactName: supplier.contactName ?? "",
    phone: supplier.phone ?? "",
    email: supplier.email ?? "",
    gstin: supplier.gstin ?? "",
    address: supplier.address ?? "",
    city: supplier.city ?? "",
    state: supplier.state ?? "",
    pincode: supplier.pincode ?? "",
  };
}

/** Only the parts that were filled in, so a row never shows an empty label. */
function describe(supplier: SupplierView): string | null {
  const place = [supplier.city, supplier.state].filter(Boolean).join(", ");
  const parts = [
    supplier.contactName,
    supplier.phone,
    place || null,
    supplier.gstin,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

export function SuppliersManager({ initial }: { initial: SupplierView[] }) {
  const [suppliers, setSuppliers] = useState(initial);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (field: keyof Draft, value: string) =>
    setDraft((prev) => (prev ? { ...prev, [field]: value } : prev));

  const save = async () => {
    if (!draft?.name.trim()) {
      toast.error("A supplier needs a name");
      return;
    }
    setSaving(true);

    const res = await fetch(
      draft.id ? `/api/admin/suppliers/${draft.id}` : "/api/admin/suppliers",
      {
        method: draft.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          contactName: draft.contactName,
          phone: draft.phone,
          email: draft.email,
          gstin: draft.gstin,
          address: draft.address,
          city: draft.city,
          state: draft.state,
          pincode: draft.pincode,
        }),
      },
    );
    setSaving(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Could not save the supplier");
      return;
    }

    const saved: SupplierView = await res.json();
    setSuppliers((prev) =>
      draft.id
        ? prev.map((s) => (s.id === saved.id ? saved : s))
        : [...prev, saved].sort((a, b) => a.name.localeCompare(b.name)),
    );
    setDraft(null);
    toast.success(draft.id ? "Supplier updated" : `${saved.name} added`);
  };

  const retire = async (supplier: SupplierView) => {
    const res = await fetch(`/api/admin/suppliers/${supplier.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not retire that supplier");
      return;
    }
    setSuppliers((prev) => prev.filter((s) => s.id !== supplier.id));
    toast.success(`${supplier.name} retired. Past deliveries are unchanged.`);
  };

  return (
    <div className={wrapStyle}>
      {draft ? (
        <div className={formStyle}>
          <div className={fieldStyle}>
            <Label htmlFor="supplier-name">Name</Label>
            <Input
              id="supplier-name"
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Workshop or wholesaler"
            />
          </div>
          <div className={fieldStyle}>
            <Label htmlFor="supplier-contact">Contact person</Label>
            <Input
              id="supplier-contact"
              value={draft.contactName}
              onChange={(e) => set("contactName", e.target.value)}
            />
          </div>
          <div className={fieldStyle}>
            <Label htmlFor="supplier-phone">Phone</Label>
            <Input
              id="supplier-phone"
              value={draft.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </div>
          <div className={fieldStyle}>
            <Label htmlFor="supplier-email">Email</Label>
            <Input
              id="supplier-email"
              value={draft.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>
          <div className={fieldStyle}>
            <Label htmlFor="supplier-gstin">GSTIN</Label>
            <Input
              id="supplier-gstin"
              value={draft.gstin}
              onChange={(e) => set("gstin", e.target.value)}
              placeholder="For claiming input credit"
            />
          </div>
          <div className={fieldStyle}>
            <Label htmlFor="supplier-address">Street address</Label>
            <Input
              id="supplier-address"
              value={draft.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </div>
          <div className={fieldStyle}>
            <Label htmlFor="supplier-city">Town or city</Label>
            <Input
              id="supplier-city"
              value={draft.city}
              onChange={(e) => set("city", e.target.value)}
              placeholder="Jaipur"
            />
          </div>
          <div className={fieldStyle}>
            <Label htmlFor="supplier-state">State</Label>
            <Input
              id="supplier-state"
              value={draft.state}
              onChange={(e) => set("state", e.target.value)}
              placeholder="Rajasthan"
            />
          </div>
          <div className={fieldStyle}>
            <Label htmlFor="supplier-pincode">PIN code</Label>
            <Input
              id="supplier-pincode"
              value={draft.pincode}
              onChange={(e) => set("pincode", e.target.value)}
              inputMode="numeric"
            />
          </div>
          <div className={actionsStyle}>
            <Button variant="outline" onClick={() => setDraft(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : draft.id ? "Save changes" : "Add supplier"}
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Button onClick={() => setDraft({ ...blank })}>
            <Plus className={iconStyle} />
            Add a supplier
          </Button>
        </div>
      )}

      {suppliers.length === 0 && !draft ? (
        <div className={emptyStyle}>
          <Truck className={css({ height: "6", width: "6" })} />
          <p>No suppliers yet.</p>
          <p className={metaStyle}>
            Add the workshops and wholesalers you buy from, then choose one when receiving
            stock. What you spend with each is totalled in Accounting.
          </p>
        </div>
      ) : (
        suppliers.map((supplier) => {
          const detail = describe(supplier);
          return (
            <div key={supplier.id} className={rowStyle}>
              <div>
                <div className={nameStyle}>{supplier.name}</div>
                {/* Nothing is printed when nothing was entered. */}
                {detail && <div className={metaStyle}>{detail}</div>}
              </div>
              <div className={css({ display: "flex", gap: "2" })}>
                <Button variant="outline" size="sm" onClick={() => setDraft(toDraft(supplier))}>
                  <Pencil className={iconStyle} />
                  Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => retire(supplier)}>
                  <X className={iconStyle} />
                  Retire
                </Button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
