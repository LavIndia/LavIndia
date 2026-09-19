import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PackagePlus, SlidersHorizontal } from "lucide-react";
import { css } from "styled-system/css";
import { queryStock, queryStockSummary, inventoryService, type StockStatus } from "@/modules/inventory";
import { LocationId } from "@/modules/_shared/ids";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { StockTable } from "@/components/admin/inventory/StockTable";
import { StockSummaryCards } from "@/components/admin/inventory/StockSummaryCards";

const pageStyle = css({ display: "flex", flexDirection: "column", gap: "6" });

const VALID_STATUSES: (StockStatus | "ALL")[] = [
  "ALL",
  "IN_STOCK",
  "LOW_STOCK",
  "OUT_OF_STOCK",
];

export default async function InventoryStockPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: string;
    locationId?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;

  const status = VALID_STATUSES.includes(params.status as StockStatus | "ALL")
    ? (params.status as StockStatus | "ALL")
    : "ALL";
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const locationId = params.locationId ? LocationId(params.locationId) : undefined;

  // Three independent reads, issued together rather than in sequence — the
  // page is only as slow as its slowest query, not the sum of all three.
  const [stock, summary, locations] = await Promise.all([
    queryStock({ search: params.search, status, locationId, page }),
    queryStockSummary(locationId),
    inventoryService.listLocations(),
  ]);

  return (
    <div className={pageStyle}>
      <AdminPageHeader
        title="Stock"
        subtitle="Live stock across every location. Shared by the storefront and the counter."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/inventory/adjustments">
                <SlidersHorizontal className={css({ height: "4", width: "4" })} />
                Adjust
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/admin/inventory/receive">
                <PackagePlus className={css({ height: "4", width: "4" })} />
                Receive Stock
              </Link>
            </Button>
          </>
        }
      />

      <StockSummaryCards summary={summary} />

      <StockTable
        data={stock}
        filters={{
          search: params.search ?? "",
          status,
          locationId: params.locationId ?? "",
        }}
        locations={locations.map((l) => ({ locationId: l.locationId, name: l.name }))}
      />
    </div>
  );
}
