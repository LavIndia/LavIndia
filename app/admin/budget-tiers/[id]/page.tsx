import { prisma } from "@/lib/prisma";
import { BudgetTierForm } from "@/components/admin/budget-tiers/BudgetTierForm";
import { notFound } from "next/navigation";

async function getBudgetTier(id: string) {
  const tier = await prisma.budgetTier.findUnique({
    where: { id },
  });
  return tier;
}

export default async function EditBudgetTierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tier = await getBudgetTier(id);

  if (!tier) {
    notFound();
  }

  return <BudgetTierForm tier={tier} />;
}
