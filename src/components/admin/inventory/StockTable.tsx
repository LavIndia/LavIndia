"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { css } from "styled-system/css";
import { formatPaisa } from "@/modules/_shared/money";
import type { StockPage } from "@/modules/inventory";
import { AdminPagination } from "@/components/admin/shared/AdminPagination";
import { InfoHint } from "@/components/ui/info-hint";
import { StockCountCell } from "./StockCountCell";
import { ReorderPointCell } from "./ReorderPointCell";
import { StockStatusBadge } from "./StockStatusBadge";
import { StockFilters, type StockFilterValues } from "./StockFilters";

const emptyStyle = css({
  padding: "12",
  textAlign: "center",
  color: "fg.muted",
  fontSize: "sm",
});

const desktopOnly = css({ display: { base: "none", lg: "block" } });
const mobileOnly = css({ display: { base: "flex", lg: "none" }, flexDirection: "column", gap: "3" });

const productCellStyle = css({ display: "flex", flexDirection: "column", gap: "0.5" });
const productNameStyle = css({ fontWeight: "medium", color: "fg.default" });
const metaStyle = css({ fontSize: "xs", color: "fg.muted" });
const numberStyle = css({ fontVariantNumeric: "tabular-nums", textAlign: "right" });
const availableStyle = css({
  fontVariantNumeric: "tabular-nums",
  textAlign: "right",
  fontWeight: "semibold",
});

const cardStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "2",
  padding: "4",
  borderRadius: "md",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
});
const cardRowStyle = css({ display: "flex", justifyContent: "space-between", gap: "3" });
const cardSettingRowStyle = css({ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "3" });

/**
 * The stock table.
 *
 * Stock itself only changes through a reasoned movement: the On hand cell
 * opens a count correction that lands in the ledger, never a silent write.
 * The reorder point is a setting, not stock, so it is edited in place.
 */
export function StockTable({
  data,
  filters,
  locations,
}: {
  data: StockPage;
  filters: StockFilterValues;
  locations: { locationId: string; name: string }[];
}) {
  const router = useRouter();

  const applyFilters = (next: Partial<StockFilterValues & { page: number }>) => {
    const merged = { ...filters, page: 1, ...next };
    const params = new URLSearchParams();
    if (merged.search) params.set("search", merged.search);
    if (merged.status && merged.status !== "ALL") params.set("status", merged.status);
    if (merged.locationId) params.set("locationId", merged.locationId);
    if (merged.page > 1) params.set("page", String(merged.page));
    router.push(`/admin/inventory/stock?${params.toString()}`);
  };

  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
      <StockFilters
        values={filters}
        locations={locations}
        onChange={(next) => applyFilters(next)}
      />

      {data.rows.length === 0 ? (
        <p className={emptyStyle}>No stock matches these filters.</p>
      ) : (
        <>
          <div className={desktopOnly}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU / Barcode</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className={numberStyle}>Price</TableHead>
                  <TableHead className={numberStyle}>
                    On hand
                    <InfoHint label="About on hand" below>
                      Every piece physically at this location, including any
                      committed to an order that has not shipped yet. This is
                      the figure a shelf count should match — tap it to
                      correct it.
                    </InfoHint>
                  </TableHead>
                  <TableHead className={numberStyle}>
                    Committed
                    <InfoHint label="About committed stock" below>
                      Promised to an online order whose payment is still in
                      progress, so it cannot be sold to anyone else. If the
                      payment fails or the checkout is abandoned, it is
                      released back automatically after 30 minutes.
                    </InfoHint>
                  </TableHead>
                  <TableHead className={numberStyle}>
                    Available
                    <InfoHint label="About available stock" below>
                      On hand minus committed — what can actually be sold
                      right now, on the website or at the counter. This is the
                      number the storefront shows.
                    </InfoHint>
                  </TableHead>
                  <TableHead className={numberStyle}>
                    Reorder at
                    <InfoHint label="About the reorder point" below>
                      When available falls to this number or below, the
                      piece is flagged Low stock. Set per piece — tap it to
                      change. Retired pieces are never flagged.
                    </InfoHint>
                  </TableHead>
                  <TableHead>
                    Status
                    <InfoHint label="About status" below>
                      Derived from availability, not set by hand. At or below
                      the piece&apos;s reorder point is Low stock; zero is Out
                      of stock.
                    </InfoHint>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((row) => (
                  <TableRow key={`${row.variantId}-${row.locationId}`}>
                    <TableCell>
                      <div className={productCellStyle}>
                        <Link
                          href={`/admin/products/${row.productId}/edit`}
                          className={productNameStyle}
                        >
                          {row.productName}
                        </Link>
                        {/* The implicit variant of an option-less product
                            adds nothing to read, so it is left off. */}
                        {!row.isDefaultVariant && (
                          <span className={metaStyle}>{row.variantName}</span>
                        )}
                        {row.isRetired && <span className={metaStyle}>Retired · not restocked</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={productCellStyle}>
                        {row.sku && <span className={metaStyle}>{row.sku}</span>}
                        {row.barcode && <span className={metaStyle}>{row.barcode}</span>}
                      </div>
                    </TableCell>
                    <TableCell className={metaStyle}>{row.locationName}</TableCell>
                    <TableCell className={numberStyle}>{formatPaisa(row.priceCents)}</TableCell>
                    {/* Correcting stock happens on the number itself — tap,
                        type the real count, tap a reason. */}
                    <TableCell className={numberStyle}>
                      <StockCountCell
                        variantId={row.variantId}
                        locationId={row.locationId}
                        quantity={row.quantity}
                      />
                    </TableCell>
                    {/* A zero here is noise on every row, so only a real
                        hold is shown. */}
                    <TableCell className={numberStyle}>
                      {row.reservedQuantity > 0 ? row.reservedQuantity : ""}
                    </TableCell>
                    <TableCell className={availableStyle}>{row.available}</TableCell>
                    <TableCell className={numberStyle}>
                      <ReorderPointCell
                        variantId={row.variantId}
                        reorderPoint={row.reorderPoint}
                        isRetired={row.isRetired}
                      />
                    </TableCell>
                    <TableCell>
                      <StockStatusBadge status={row.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className={mobileOnly}>
            {data.rows.map((row) => (
              <div key={`${row.variantId}-${row.locationId}`} className={cardStyle}>
                <div className={cardRowStyle}>
                  <div className={productCellStyle}>
                    <span className={productNameStyle}>{row.productName}</span>
                    {!row.isDefaultVariant && (
                      <span className={metaStyle}>{row.variantName}</span>
                    )}
                    {row.sku && <span className={metaStyle}>{row.sku}</span>}
                    {row.isRetired && <span className={metaStyle}>Retired · not restocked</span>}
                  </div>
                  <StockStatusBadge status={row.status} />
                </div>
                <div className={cardRowStyle}>
                  <span className={metaStyle}>
                    {row.locationName} · {formatPaisa(row.priceCents)}
                  </span>
                  <span className={availableStyle}>
                    {row.available} available
                    {row.reservedQuantity > 0 && ` · ${row.reservedQuantity} held`}
                  </span>
                </div>
                <div className={cardSettingRowStyle}>
                  <span className={metaStyle}>Reorder at</span>
                  <ReorderPointCell
                    variantId={row.variantId}
                    reorderPoint={row.reorderPoint}
                    isRetired={row.isRetired}
                  />
                </div>
              </div>
            ))}
          </div>

          <AdminPagination
            page={data.page}
            pageSize={data.pageSize}
            totalCount={data.totalCount}
            totalPages={data.totalPages}
            onPageChange={(page) => applyFilters({ page })}
          />
        </>
      )}
    </div>
  );
}
