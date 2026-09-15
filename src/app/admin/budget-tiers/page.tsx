import { prisma } from "@/lib/prisma";
import { BudgetTiersTable } from "@/components/admin/budget-tiers/BudgetTiersTable";
import { BudgetTiersHeader } from "@/components/admin/budget-tiers/BudgetTiersHeader";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getBudgetTiers() {
  const tiers = await prisma.budgetTier.findMany({
    orderBy: { order: "asc" },
  });
  return tiers;
}

export default async function BudgetTiersPage() {
  const tiers = await getBudgetTiers();

  return (
    <div className="space-y-6">
      <BudgetTiersHeader />
      <BudgetTiersTable tiers={tiers} />
    </div>
  );
}
