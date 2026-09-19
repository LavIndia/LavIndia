import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { History } from "lucide-react";
import { css } from "styled-system/css";
import { inventoryService } from "@/modules/inventory";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { AdjustStockForm } from "@/components/admin/inventory/AdjustStockForm";

const pageStyle = css({ display: "flex", flexDirection: "column", gap: "6" });
const noteStyle = css({ fontSize: "sm", color: "fg.muted", lineHeight: "relaxed" });

export const metadata = {
  title: "Stock Adjustments",
};

export default async function AdjustmentsPage() {
  const locations = await inventoryService.listLocations();
  const defaultLocation = locations.find((l) => l.isDefault) ?? locations[0];

  return (
    <div className={pageStyle}>
      <AdminPageHeader
        title="Adjustments"
        subtitle={
          defaultLocation
            ? `Correcting stock at ${defaultLocation.name}.`
            : "Correcting stock."
        }
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/inventory/movements">
              <History className={css({ height: "4", width: "4" })} />
              Movement History
            </Link>
          </Button>
        }
      />

      <Card>
        <div className={css({ padding: "6" })}>
          <AdjustStockForm locationId={defaultLocation?.locationId} />
        </div>
      </Card>

      <p className={noteStyle}>
        Use an adjustment when stock changed for a reason that is not a sale or
        a delivery — a stocktake correction, a damaged piece, something lost.
        Deliveries belong in Receive Stock, and sales adjust themselves. Every
        adjustment is permanent, carries its reason, and appears in Movements
        against the person who made it.
      </p>
    </div>
  );
}
