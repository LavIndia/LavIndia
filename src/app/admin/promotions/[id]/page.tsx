import { notFound } from "next/navigation";
import { PromotionEditor } from "@/components/admin/promotions/PromotionEditor";
import { draftFromInput } from "@/components/admin/promotions/promotion-draft";
import { getPromotion, statusOf, toInput } from "@/modules/promotions";
import { isDomainError } from "@/modules/_shared/errors";
import { loadEditorData } from "../editor-data";

export const dynamic = "force-dynamic";

export default async function EditPromotionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await getPromotion(id).catch((error) => {
    if (isDomainError(error)) return null;
    throw error;
  });
  if (!row) notFound();

  const data = await loadEditorData();
  return <PromotionEditor key={row.updatedAt.toISOString()} initial={draftFromInput(toInput(row))} promotionId={row.id} status={statusOf(row)} {...data} />;
}
