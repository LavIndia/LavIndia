import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PromotionsList, type PromotionListItem } from "@/components/admin/promotions/PromotionsList";
import {
  benefitSchema,
  describeBenefit,
  labelOf,
  listPromotions,
  loadCatalogFacts,
  pieceFilterSchema,
  statusOf,
} from "@/modules/promotions";
import { css } from "styled-system/css";

export const dynamic = "force-dynamic";

async function getItems(): Promise<PromotionListItem[]> {
  const [rows, facts] = await Promise.all([listPromotions(), loadCatalogFacts()]);
  const now = new Date();
  return rows.map((row) => {
    const benefit = benefitSchema.safeParse(row.benefit);
    const pieces = pieceFilterSchema.safeParse(row.pieces);
    return {
      id: row.id,
      name: row.name,
      title: labelOf(row),
      summary:
        benefit.success && pieces.success
          ? describeBenefit(benefit.data, pieces.data, facts.names)
          : "Settings incomplete",
      status: statusOf(row, now),
      trigger: row.trigger,
      code: row.codes[0]?.code ?? null,
      channels: row.channels,
      startsAt: row.startsAt?.toISOString() ?? null,
      endsAt: row.endsAt?.toISOString() ?? null,
      usedCount: row.usedCount,
      usageLimit: row.usageLimit,
      discountGivenCents: row.discountGivenCents,
    };
  });
}

export default async function PromotionsPage() {
  const items = await getItems();
  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "6" })}>
      <div
        className={css({
          display: "flex",
          flexDirection: { base: "column", sm: "row" },
          alignItems: { base: "stretch", sm: "flex-end" },
          justifyContent: "space-between",
          gap: "4",
        })}
      >
        <div className={css({ display: "flex", flexDirection: "column", gap: "1" })}>
          <h1
            className={css({
              fontFamily: "display",
              fontSize: { base: "2xl", md: "3xl" },
              fontWeight: "bold",
              color: "fg.default",
            })}
          >
            Offers
          </h1>
          <p className={css({ color: "fg.muted", fontSize: "sm", maxWidth: "60ch" })}>
            Set prices, Buy X Get Y, bundles, tiers and codes — built here, applied the same way
            online and at the counter.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/promotions/new">
            <Plus className={css({ width: "4", height: "4" })} />
            New offer
          </Link>
        </Button>
      </div>
      <PromotionsList items={items} />
    </div>
  );
}
