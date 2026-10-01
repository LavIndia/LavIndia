"use client";

import { useState } from "react";
import { ChevronDown, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { css } from "styled-system/css";
import { Button } from "@/components/ui/button";
import type { SupplierView } from "@/modules/purchasing";
import { describeSupplier } from "./describe-supplier";

/**
 * Suppliers that were retired, folded away under the list in use.
 *
 * Retiring only takes a vendor out of the Receive stock picker; their past
 * deliveries stay. So it is undoable — a workshop the shop goes back to is
 * reinstated here rather than added again (which its unique name would
 * refuse anyway). Nothing is shown when no supplier has been retired.
 */
const sectionStyle = css({ display: "flex", flexDirection: "column", gap: "2", marginTop: "2" });
const toggleStyle = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "1.5",
  alignSelf: "flex-start",
  fontSize: "sm",
  color: "fg.muted",
  cursor: "pointer",
  "&:hover": { color: "fg.default" },
});
const rowStyle = css({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "3",
  padding: "3.5",
  borderRadius: "lg",
  border: "1px dashed",
  borderColor: "border.subtle",
  background: "bg.canvas",
});
const nameStyle = css({ fontWeight: "medium", color: "fg.muted" });
const metaStyle = css({ fontSize: "sm", color: "fg.muted", lineHeight: "1.5" });
const iconStyle = css({ height: "4", width: "4" });

export function RetiredSuppliers({
  suppliers,
  onReinstated,
}: {
  suppliers: SupplierView[];
  onReinstated: (supplier: SupplierView) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (suppliers.length === 0) return null;

  const reinstate = async (supplier: SupplierView) => {
    setBusyId(supplier.id);
    try {
      const res = await fetch(`/api/admin/suppliers/${supplier.id}/reinstate`, { method: "POST" });
      if (!res.ok) {
        toast.error("Could not reinstate that supplier");
        return;
      }
      onReinstated(await res.json());
      toast.success(`${supplier.name} reinstated. They can be chosen when receiving stock again.`);
    } catch {
      toast.error("Could not reach the server. Nothing was changed.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className={sectionStyle} aria-label="Retired suppliers">
      <button
        type="button"
        className={toggleStyle}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <ChevronDown
          className={css({ height: "4", width: "4", transition: "transform 0.15s ease" })}
          style={{ transform: open ? "rotate(180deg)" : undefined }}
        />
        Retired suppliers ({suppliers.length})
      </button>

      {open &&
        suppliers.map((supplier) => {
          const detail = describeSupplier(supplier);
          return (
            <div key={supplier.id} className={rowStyle}>
              <div>
                <div className={nameStyle}>{supplier.name}</div>
                {detail && <div className={metaStyle}>{detail}</div>}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => reinstate(supplier)}
                disabled={busyId === supplier.id}
              >
                <RotateCcw className={iconStyle} />
                {busyId === supplier.id ? "Reinstating…" : "Reinstate"}
              </Button>
            </div>
          );
        })}
    </section>
  );
}
