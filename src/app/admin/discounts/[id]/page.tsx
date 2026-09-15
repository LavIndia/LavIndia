import { prisma } from "@/lib/prisma";
import { DiscountForm } from "@/components/admin/discounts/DiscountForm";
import { notFound } from "next/navigation";

async function getDiscount(id: string) {
  const discount = await prisma.discount.findUnique({
    where: { id },
  });
  return discount;
}

export default async function EditDiscountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const discount = await getDiscount(id);

  if (!discount) {
    notFound();
  }

  return <DiscountForm discount={discount} />;
}
