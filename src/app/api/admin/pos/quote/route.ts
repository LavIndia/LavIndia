/**
 * Prices the counter's basket exactly as the sale will be charged — live
 * offers, codes, manual prices and GST — so the screen, the bill and the
 * invoice always show the same total.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import { requireAdmin } from "@/lib/require-admin";
import { priceCart, quoteView } from "@/lib/cart-quote";

const schema = z.object({
  lines: z
    .array(
      z.object({
        variantId: z.string().min(1),
        quantity: z.number().int().positive(),
        overridePriceCents: z.number().int().min(0).optional(),
        overrideReason: z.string().trim().max(200).optional(),
      }),
    )
    .max(200),
  codes: z.array(z.string().trim().min(1).max(40)).max(5).default([]),
  paymentMethod: z.enum(["CASH", "UPI", "CARD", "OTHER"]).optional(),
});

export const POST = apiHandler(async (req: NextRequest) => {
  await requireAdmin("pos:sell");
  const input = schema.parse(await req.json());
  if (input.lines.length === 0) return NextResponse.json({ empty: true });

  const priced = await priceCart({
    channel: "STORE",
    lines: input.lines,
    codes: input.codes,
    paymentMethod: input.paymentMethod && input.paymentMethod !== "OTHER" ? input.paymentMethod : null,
  });
  return NextResponse.json(quoteView(priced));
});
