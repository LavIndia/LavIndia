/**
 * One supplier: read, amend, retire.
 *
 * There is no delete. Past deliveries point here and the accounts are built
 * from them, so a supplier that is no longer used is retired and drops out
 * of the pickers while its history stays intact.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { apiHandler } from "@/lib/api-handler";
import { requireAdmin } from "@/lib/require-admin";
import { createAuditLog } from "@/lib/audit";
import { supplierService } from "@/modules/purchasing";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
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

export const GET = apiHandler(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdmin("inventory:read");
    const { id } = await params;

    const supplier = await supplierService.get(id);
    if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });

    return NextResponse.json(supplier);
  },
);

export const PATCH = apiHandler(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const actor = await requireAdmin("inventory:write");
    const { id } = await params;
    const input = updateSchema.parse(await req.json());

    const supplier = await supplierService.update(id, input);

    await createAuditLog({
      adminId: actor.id,
      adminName: actor.name ?? undefined,
      action: "UPDATE",
      entity: "Supplier",
      entityId: supplier.id,
      metadata: { name: supplier.name, changes: Object.keys(input) },
    });

    return NextResponse.json(supplier);
  },
);

export const DELETE = apiHandler(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const actor = await requireAdmin("inventory:write");
    const { id } = await params;

    const supplier = await supplierService.deactivate(id);

    await createAuditLog({
      adminId: actor.id,
      adminName: actor.name ?? undefined,
      action: "UPDATE",
      entity: "Supplier",
      entityId: supplier.id,
      metadata: { name: supplier.name, retired: true },
    });

    return NextResponse.json(supplier);
  },
);
