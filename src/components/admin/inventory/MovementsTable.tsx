"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";
import { css } from "styled-system/css";
import type { MovementPage } from "@/modules/inventory";
import { AdminPagination } from "@/components/admin/shared/AdminPagination";
import { InfoHint } from "@/components/ui/info-hint";

/** How each movement type reads, and whether it added or removed stock. */
const TYPE_PRESENTATION: Record<string, { label: string; adds: boolean }> = {
  RECEIVE: { label: "Received", adds: true },
  SALE: { label: "Sold", adds: false },
  RETURN: { label: "Returned", adds: true },
  ADJUSTMENT_IN: { label: "Counted up", adds: true },
  ADJUSTMENT_OUT: { label: "Counted down", adds: false },
  DAMAGE: { label: "Damaged", adds: false },
  RESERVE: { label: "Committed", adds: false },
  RELEASE: { label: "Released", adds: true },
};

const TYPE_FILTERS = [
  { value: "ALL", label: "All movements" },
  ...Object.entries(TYPE_PRESENTATION).map(([value, p]) => ({ value, label: p.label })),
];

const filterRowStyle = css({
  display: "flex",
  flexDirection: { base: "column", md: "row" },
  gap: "3",
});
const searchWrapStyle = css({ position: "relative", flex: "1", minWidth: "0" });
const searchIconStyle = css({
  position: "absolute",
  left: "3",
  top: "50%",
  transform: "translateY(-50%)",
  height: "4",
  width: "4",
  color: "fg.muted",
  pointerEvents: "none",
});
const searchInputStyle = css({ paddingLeft: "9" });
const selectStyle = css({ width: { base: "full", md: "13rem" } });

const emptyStyle = css({ padding: "12", textAlign: "center", color: "fg.muted", fontSize: "sm" });
const metaStyle = css({ fontSize: "xs", color: "fg.muted" });
const cellStackStyle = css({ display: "flex", flexDirection: "column", gap: "0.5" });
const numberStyle = css({ fontVariantNumeric: "tabular-nums", textAlign: "right" });
const deltaStyle = (adds: boolean) =>
  css({
    fontVariantNumeric: "tabular-nums",
    textAlign: "right",
    fontWeight: "semibold",
    color: adds ? "emerald.500" : "red.600",
  });

export interface MovementFilterValues {
  search: string;
  type: string;
}

/**
 * The movement ledger.
 *
 * Read-only by construction — there is no edit or delete here and no API to
 * support one. An inventory history that can be rewritten is not a history,
 * and this table is what an accountant or an auditor reads.
 */
export function MovementsTable({
  data,
  filters,
}: {
  data: MovementPage;
  filters: MovementFilterValues;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(filters.search);

  useEffect(() => setSearch(filters.search), [filters.search]);

  const apply = (next: Partial<MovementFilterValues & { page: number }>) => {
    const merged = { ...filters, page: 1, ...next };
    const params = new URLSearchParams();
    if (merged.search) params.set("search", merged.search);
    if (merged.type && merged.type !== "ALL") params.set("type", merged.type);
    if (merged.page > 1) params.set("page", String(merged.page));
    router.push(`/admin/inventory/movements?${params.toString()}`);
  };

  useEffect(() => {
    if (search === filters.search) return;
    const timer = setTimeout(() => apply({ search }), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
      <div className={filterRowStyle}>
        <div className={searchWrapStyle}>
          <Search className={searchIconStyle} />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search product, SKU, barcode or order number"
            className={searchInputStyle}
            aria-label="Search movements"
          />
        </div>
        <Select value={filters.type} onValueChange={(type) => apply({ type })}>
          <SelectTrigger className={selectStyle} aria-label="Filter by movement type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_FILTERS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {data.rows.length === 0 ? (
        <p className={emptyStyle}>No movements match these filters.</p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Movement</TableHead>
                <TableHead className={numberStyle}>
                  Change
                  <InfoHint label="About change" below>
                    How many pieces this entry added or removed. Green added,
                    red removed.
                  </InfoHint>
                </TableHead>
                <TableHead className={numberStyle}>
                  Before → After
                  <InfoHint label="About before and after" below>
                    The stock level immediately before and after this entry, as
                    recorded at the time. Replaying every entry in order
                    reproduces today&rsquo;s stock exactly.
                  </InfoHint>
                </TableHead>
                <TableHead>Reason / Reference</TableHead>
                <TableHead>By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row) => {
                const presentation = TYPE_PRESENTATION[row.type] ?? {
                  label: row.type,
                  adds: true,
                };
                return (
                  <TableRow key={row.id}>
                    <TableCell className={metaStyle}>
                      {new Date(row.createdAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>
                      <div className={cellStackStyle}>
                        <span>{row.productName}</span>
                        <span className={metaStyle}>
                          {[row.variantName, row.sku].filter(Boolean).join(" · ")}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{presentation.label}</Badge>
                    </TableCell>
                    <TableCell className={deltaStyle(presentation.adds)}>
                      {presentation.adds ? "+" : "−"}
                      {row.quantity}
                    </TableCell>
                    <TableCell className={numberStyle}>
                      {row.beforeQuantity} → {row.afterQuantity}
                    </TableCell>
                    <TableCell>
                      <div className={cellStackStyle}>
                        {/* Omitted rather than shown blank when absent. */}
                        {row.reason && <span>{row.reason}</span>}
                        {row.referenceLabel && (
                          <span className={metaStyle}>{row.referenceLabel}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className={metaStyle}>
                      {row.createdByName ?? row.createdBy ?? "system"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <AdminPagination
            page={data.page}
            pageSize={data.pageSize}
            totalCount={data.totalCount}
            totalPages={data.totalPages}
            onPageChange={(page) => apply({ page })}
          />
        </>
      )}
    </div>
  );
}
