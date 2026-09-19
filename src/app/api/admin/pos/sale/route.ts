/**
 * Completes a counter sale.
 *
 * Thin by design: authorise, parse, hand to the POS service. The sale, the
 * stock movement and the invoice all happen inside one transaction there, so
 * this route has nothing to coordinate.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import { requireAdmin } from "@/lib/require-admin";
import { createAuditLog } from "@/lib/audit";
import { posService } from "@/modules/pos";
import { VariantId } from "@/modules/_shared/ids";

const schema = z.object({
  lines: z
    .array(
      z.object({
        variantId: z.string().min(1),
        quantity: z.number().int().positive(),
        // Prices are resolved from the catalog; only an explicit override is
        // accepted from the client, and it is recorded as an override.
        overridePriceCents: z.number().int().min(0).optional(),
        overrideReason: z.string().trim().max(200).optional(),
      }),
    )
    .min(1, "Add something to the sale first"),
  payment: z.object({
    method: z.enum(["CASH", "UPI", "CARD", "OTHER"]),
    reference: z.string().trim().max(120).optional(),
    payerVpa: z.string().trim().max(120).optional(),
    utr: z.string().trim().max(40).optional(),
  }),
  customer: z
    .object({
      customerId: z.string().min(1).optional(),
      name: z.string().trim().max(120).optional(),
      mobile: z.string().trim().max(20).optional(),
      gstin: z.string().trim().max(20).optional(),
    })
    .optional(),
  discountCents: z.number().int().min(0).optional(),
  notes: z.string().trim().max(500).optional(),
  /** Makes a double-tap or a retry safe — the same key returns the same sale. */
  idempotencyKey: z.string().min(8).max(200).optional(),
});

export const POST = apiHandler(async (req: NextRequest) => {
  const actor = await requireAdmin("pos:sell");
  const input = schema.parse(await req.json());

  const overridden = input.lines.filter((line) => line.overridePriceCents !== undefined);
  if (overridden.length > 0) {
    // Overriding a price is a privileged act, checked separately from the
    // ability to ring up an ordinary sale.
    await requireAdmin("pos:override-price");
  }

  const sale = await posService.completeSale({
    lines: input.lines.map((line) => ({
      variantId: VariantId(line.variantId),
      quantity: line.quantity,
      overridePriceCents: line.overridePriceCents,
      overrideReason: line.overrideReason,
    })),
    payment: input.payment,
    customer: input.customer,
    discountCents: input.discountCents,
    notes: input.notes,
    actorId: actor.id,
    idempotencyKey: input.idempotencyKey,
  });

  await createAuditLog({
    adminId: actor.id,
    adminName: actor.name ?? undefined,
    action: "POS_SALE",
    entity: "Order",
    entityId: sale.orderId,
    metadata: {
      orderNumber: sale.orderNumber,
      invoiceNumber: sale.invoiceNumber,
      totalCents: sale.grandTotalCents,
      paymentMethod: input.payment.method,
      overriddenLines: overridden.length,
    },
  });

  return NextResponse.json({ success: true, sale });
});
