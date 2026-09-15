import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function createAuditLog({
  adminId,
  adminName,
  action,
  entity,
  entityId,
  metadata,
}: {
  adminId: string;
  adminName?: string;
  action: string;
  entity: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        adminId,
        adminName,
        action,
        entity,
        entityId,
        metadata: metadata || Prisma.JsonNull,
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}

// Alias for convenience
export const logAudit = createAuditLog;
