import type { InventoryMovementType } from "@prisma/client";
import { css } from "styled-system/css";
import { queryMovements } from "@/modules/inventory";
import { AdminPageHeader } from "@/components/admin/shared/AdminPageHeader";
import { MovementsTable } from "@/components/admin/inventory/MovementsTable";

const pageStyle = css({ display: "flex", flexDirection: "column", gap: "6" });
const noteStyle = css({ fontSize: "sm", color: "fg.muted", lineHeight: "relaxed" });

export const metadata = {
  title: "Stock Movements",
};

const VALID_TYPES = [
  "RECEIVE",
  "SALE",
  "RETURN",
  "ADJUSTMENT_IN",
  "ADJUSTMENT_OUT",
  "DAMAGE",
  "RESERVE",
  "RELEASE",
];

export default async function MovementsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; type?: string; page?: string }>;
}) {
  const params = await searchParams;
  const type = VALID_TYPES.includes(params.type ?? "") ? params.type : "ALL";
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);

  const data = await queryMovements({
    search: params.search,
    type: type === "ALL" ? "ALL" : (type as InventoryMovementType),
    page,
  });

  return (
    <div className={pageStyle}>
      <AdminPageHeader
        title="Movements"
        subtitle="Every change to stock, in the order it happened."
      />

      <MovementsTable data={data} filters={{ search: params.search ?? "", type: type ?? "ALL" }} />

      <p className={noteStyle}>
        This ledger is permanent — entries are never edited or deleted, and
        there is no button here that could. A mistake is corrected by making a
        further adjustment, so the correction is visible too. Replaying every
        entry in order reproduces the current stock exactly, which is what makes
        the numbers on the Stock screen auditable rather than merely asserted.
      </p>
    </div>
  );
}
