/**
 * Prices the storefront cart: offers, GST, delivery and the cash-on-delivery
 * fee — exactly as the order route will charge it.
 *
 * Open to guests, so the cart drawer can show offers before sign-in; a
 * signed-in client also gets the offers meant for them.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { apiHandler } from "@/lib/api-handler";
import { prisma } from "@/lib/prisma";
import { cartItemSchema, resolveCartLines } from "@/lib/cart-lines";
import { priceCart, quoteView } from "@/lib/cart-quote";
import { shippingCentsFor, onlinePaymentInstrument } from "@/lib/online-charges";

const schema = z.object({
  items: z.array(cartItemSchema).max(100),
  code: z.string().trim().max(40).optional(),
  shippingMethod: z.enum(["standard", "express"]).optional(),
  paymentMethod: z.enum(["upi", "card", "cod"]).optional(),
});

export const POST = apiHandler(async (req: NextRequest) => {
  const input = schema.parse(await req.json());
  if (input.items.length === 0) {
    return NextResponse.json({ empty: true });
  }

  const [session, lines, settings] = await Promise.all([
    auth(),
    resolveCartLines(input.items),
    prisma.siteSettings.findFirst({ select: { codFeeCents: true } }),
  ]);

  const priced = await priceCart({
    channel: "ONLINE",
    lines,
    codes: input.code ? [input.code] : [],
    customerId: session?.user?.id ?? null,
    paymentMethod: onlinePaymentInstrument(input.paymentMethod),
    shippingCents: shippingCentsFor(input.shippingMethod),
  });

  const view = quoteView(priced);
  const codFeeCents = input.paymentMethod === "cod" ? (settings?.codFeeCents ?? 0) : 0;
  return NextResponse.json({
    ...view,
    codFeeCents,
    payableCents: view.totals.grandTotalCents + codFeeCents,
  });
});
