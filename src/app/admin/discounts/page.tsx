import { prisma } from "@/lib/prisma";
import { DiscountsTable } from "@/components/admin/discounts/DiscountsTable";
import { DiscountsHeader } from "@/components/admin/discounts/DiscountsHeader";
import { css } from "styled-system/css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getDiscounts() {
  const discounts = await prisma.discount.findMany({
    orderBy: { createdAt: "desc" },
  });
  return discounts;
}

export default async function DiscountsPage() {
  const discounts = await getDiscounts();

  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "6" })}>
      <DiscountsHeader />
      <DiscountsTable discounts={discounts} />
    </div>
  );
}
