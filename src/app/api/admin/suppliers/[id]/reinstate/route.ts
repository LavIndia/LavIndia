/**
 * Reinstates a retired supplier — the reverse of retiring it (DELETE on the
 * supplier). It returns to the pickers on Receive stock; its past deliveries
 * were never touched, so nothing else changes.
 */
import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { requireAdmin } from "@/lib/require-admin";
import { createAuditLog } from "@/lib/audit";
import { supplierService } from "@/modules/purchasing";

export const POST = apiHandler(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const actor = await requireAdmin("inventory:write");
    const { id } = await params;

    const supplier = await supplierService.reactivate(id);

    await createAuditLog({
      adminId: actor.id,
      adminName: actor.name ?? undefined,
      action: "UPDATE",
      entity: "Supplier",
      entityId: supplier.id,
      metadata: { name: supplier.name, retired: false },
    });

    return NextResponse.json(supplier);
  },
);
