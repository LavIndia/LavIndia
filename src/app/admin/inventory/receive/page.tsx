import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Boxes } from "lucide-react";
import { css } from "styled-system/css";
import { inventoryService } from "@/modules/inventory";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { ReceiveStockForm } from "@/components/admin/inventory/ReceiveStockForm";

const pageStyle = css({ display: "flex", flexDirection: "column", gap: "6" });
const noteStyle = css({ fontSize: "sm", color: "fg.muted", lineHeight: "relaxed" });

export const metadata = {
  title: "Receive Stock",
};

export default async function ReceiveStockPage() {
  const locations = await inventoryService.listLocations();
  const defaultLocation = locations.find((l) => l.isDefault) ?? locations[0];

  return (
    <div className={pageStyle}>
      <AdminPageHeader
        title="Receive Stock"
        subtitle={
          defaultLocation
            ? `Booking new stock into ${defaultLocation.name}.`
            : "Booking new stock in."
        }
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/inventory/stock">
              <Boxes className={css({ height: "4", width: "4" })} />
              View Stock
            </Link>
          </Button>
        }
      />

      <Card>
        <div className={css({ padding: "6" })}>
          <ReceiveStockForm locationId={defaultLocation?.locationId} />
        </div>
      </Card>

      <p className={noteStyle}>
        {/* Stated plainly because it is the rule that most often surprises
            someone coming from a spreadsheet. */}
        Receiving adds to what is already on the shelf — it never replaces the
        count. Every line is recorded in Inventory › Movements with who booked
        it in and when. A barcode that is not recognised will not create a
        product; add the product in Catalog first, then receive it here.
      </p>
    </div>
  );
}
