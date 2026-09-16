import { prisma } from "@/lib/prisma";
import { BudgetTiersTable } from "@/components/admin/budget-tiers/BudgetTiersTable";
import { BudgetTiersHeader } from "@/components/admin/budget-tiers/BudgetTiersHeader";
import { css } from "styled-system/css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const pageStyle = css({ display: "flex", flexDirection: "column", gap: "6" });

async function getBudgetTiers() {
  const tiers = await prisma.budgetTier.findMany({
    orderBy: { order: "asc" },
  });
  return tiers;
}

export default async function BudgetTiersPage() {
  const tiers = await getBudgetTiers();

  return (
    <div className={pageStyle}>
      <BudgetTiersHeader />
      <BudgetTiersTable tiers={tiers} />
    </div>
  );
}
