/**
 * Receive stock into a location.
 *
 * The route stays thin: authorise, parse, hand to the Inventory service,
 * record the admin action. All stock rules and atomicity live in the module.
 */
import { NextRequest, NextResponse } from "next/server";
import { revalidateStockViews } from "@/lib/catalog-cache";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import { requireAdmin } from "@/lib/require-admin";
import { createAuditLog } from "@/lib/audit";
import { inventoryService } from "@/modules/inventory";
import { LocationId, VariantId } from "@/modules/_shared/ids";

const receiveSchema = z.object({
  lines: z
    .array(
      z.object({
        variantId: z.string().min(1),
        quantity: z.number().int().positive(),
        /// What one unit cost on this delivery, in paisa. Optional, because
        /// a delivery note does not always arrive with the invoice.
        unitCostCents: z.number().int().min(0).optional(),
        /// What the vendor first asked, per unit, before any bargaining.
        listUnitCostCents: z.number().int().min(0).optional(),
        /// The price per unit agreed after bargaining.
        agreedUnitCostCents: z.number().int().min(0).optional(),
      }),
    )
    .min(1, "Add at least one item"),
  locationId: z.string().min(1).optional(),
  supplierId: z.string().min(1).optional(),
  invoiceNumber: z.string().trim().max(100).optional(),
  /// Sent as a plain date string by the form; coerced here so the service
  /// only ever deals in real dates.
  invoiceDate: z.coerce.date().optional(),
  reason: z.string().trim().max(500).optional(),
  /** Supplied by the client so a retried submission cannot receive twice. */
  idempotencyKey: z.string().min(8).max(200).optional(),
});

export const POST = apiHandler(async (req: NextRequest) => {
  const actor = await requireAdmin("inventory:write");
  const input = receiveSchema.parse(await req.json());

  const movements = await inventoryService.receive(
    input.lines.map((line) => ({
      variantId: VariantId(line.variantId),
      quantity: line.quantity,
      unitCostCents: line.unitCostCents,
      listUnitCostCents: line.listUnitCostCents,
      agreedUnitCostCents: line.agreedUnitCostCents,
    })),
    {
      locationId: input.locationId ? LocationId(input.locationId) : undefined,
      supplierId: input.supplierId,
      invoiceNumber: input.invoiceNumber,
      invoiceDate: input.invoiceDate,
      reason: input.reason,
      actorId: actor.id,
      idempotencyKey: input.idempotencyKey,
    },
  );

  await createAuditLog({
    adminId: actor.id,
    adminName: actor.name ?? undefined,
    action: "RECEIVE_STOCK",
    entity: "Inventory",
    metadata: {
      lines: movements.map((m) => ({
        variantId: m.variantId,
        quantity: m.quantity,
        before: m.beforeQuantity,
        after: m.afterQuantity,
      })),
      reason: input.reason ?? null,
    },
  });

  revalidateStockViews();
  return NextResponse.json({ success: true, movements });
});
