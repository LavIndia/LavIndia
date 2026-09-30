/**
 * "Test with a cart": prices a sample cart against the offer being edited —
 * optionally alongside every offer already live — exactly as checkout and
 * the counter would. Writes nothing.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import { requireAdmin } from "@/lib/require-admin";
import { getPromotionSnapshot } from "@/lib/promotions-cache";
import { catalogService } from "@/modules/catalog";
import { GST_RATE_BPS, quoteCart } from "@/modules/orders";
import { VariantId } from "@/modules/_shared/ids";
import { inputToEngine, promotionInputSchema, toEnginePromotions } from "@/modules/promotions";

const schema = z.object({
  input: promotionInputSchema,
  selfId: z.string().optional(),
  channel: z.enum(["ONLINE", "STORE"]),
  at: z.coerce.date().optional(),
  code: z.string().trim().max(40).optional(),
  includeLive: z.boolean().default(true),
  lines: z.array(z.object({ variantId: z.string().min(1), quantity: z.number().int().min(1).max(50) })).min(1),
});

export const POST = apiHandler(async (req: NextRequest) => {
  await requireAdmin("catalog:write");
  const body = schema.parse(await req.json());

  const [snapshot, variantList] = await Promise.all([
    getPromotionSnapshot(),
    catalogService.findVariantsByIds(body.lines.map((l) => VariantId(l.variantId))),
  ]);
  const draft = inputToEngine(body.input, body.selfId ?? "draft");
  const others = body.includeLive
    ? toEnginePromotions(snapshot.rows.filter((row) => row.id !== body.selfId))
    : [];
  const pricesIncludeTax =
    body.channel === "ONLINE" ? snapshot.onlinePricesIncludeGst : snapshot.storePricesIncludeGst;
  const codes = [body.code, body.input.code].filter((c): c is string => Boolean(c));

  const quote = quoteCart(
    {
      channel: body.channel,
      lines: body.lines.map((l) => ({ variantId: VariantId(l.variantId), quantity: l.quantity })),
      promotions: [draft, ...others],
      codes,
      shippingCents: body.channel === "ONLINE" ? 9_900 : 0,
      pricesIncludeTax,
      taxRateBps: GST_RATE_BPS,
      now: body.at,
    },
    new Map(variantList.map((v) => [v.variantId as string, v])),
  );

  return NextResponse.json({
    lines: quote.lines.map((line) => ({
      name: line.name,
      variantName: line.variantName,
      quantity: line.quantity,
      catalogPriceCents: line.catalogPriceCents,
      priceCents: line.priceCents,
      discountCents: line.discountCents,
      taxCents: line.taxCents,
      lineTotalCents: line.lineTotalCents,
      // Margin on what the piece actually sells for, before tax.
      marginCents:
        line.unitCostCents === null
          ? null
          : (pricesIncludeTax ? line.lineTotalCents - line.taxCents : line.lineTotalCents) -
            line.unitCostCents * line.quantity,
      offers: [...new Set(line.allocations.map((a) => a.label))],
    })),
    totals: quote.totals,
    applied: quote.applied,
    rejected: quote.evaluation.rejected,
    nudges: quote.evaluation.nudges,
    draftApplied: quote.applied.some((a) => a.promotionId === draft.id),
  });
});
