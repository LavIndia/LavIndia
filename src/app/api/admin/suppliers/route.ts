/**
 * Suppliers: list and create.
 *
 * Thin, like the other inventory routes — authorise, parse, hand to the
 * module. The picker on the Receive Stock screen reads this, which is why
 * creating one returns the whole record: a supplier added mid-delivery has
 * to be selectable without a reload.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import { requireAdmin } from "@/lib/require-admin";
import { createAuditLog } from "@/lib/audit";
import { supplierService } from "@/modules/purchasing";

const supplierSchema = z.object({
  name: z.string().trim().min(1, "A supplier needs a name").max(160),
  contactName: z.string().trim().max(160).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  email: z.string().trim().max(160).nullable().optional(),
  gstin: z.string().trim().max(20).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  state: z.string().trim().max(120).nullable().optional(),
  pincode: z.string().trim().max(12).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const GET = apiHandler(async (req: NextRequest) => {
  await requireAdmin("inventory:read");

  const includeInactive = req.nextUrl.searchParams.get("includeInactive") === "true";
  return NextResponse.json(await supplierService.list({ includeInactive }));
});

export const POST = apiHandler(async (req: NextRequest) => {
  const actor = await requireAdmin("inventory:write");
  const input = supplierSchema.parse(await req.json());

  const supplier = await supplierService.create(input);

  await createAuditLog({
    adminId: actor.id,
    adminName: actor.name ?? undefined,
    action: "CREATE",
    entity: "Supplier",
    entityId: supplier.id,
    metadata: { name: supplier.name },
  });

  return NextResponse.json(supplier, { status: 201 });
});
