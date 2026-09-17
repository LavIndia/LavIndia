import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const tier = await prisma.budgetTier.update({
      where: { id },
      data: {
        ...(body.title && { title: body.title }),
        ...(body.maxPrice !== undefined && { maxPrice: body.maxPrice }),
        ...(body.gradient && { gradient: body.gradient }),
        ...(body.icon !== undefined && { icon: body.icon }),
        ...(body.order !== undefined && { order: body.order }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });

    await logAudit({
      adminId: session.user.id || "system",
      adminName: session.user.name || session.user.email || "Admin",
      action: "UPDATE",
      entity: "BudgetTier",
      entityId: tier.id,
      metadata: { title: tier.title },
    });

    revalidateTag("homepage");

    return NextResponse.json({ tier });
  } catch (error) {
    console.error("Error updating budget tier:", error);
    return NextResponse.json(
      { error: "Failed to update budget tier" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tier = await prisma.budgetTier.delete({
      where: { id },
    });

    await logAudit({
      adminId: session.user.id || "system",
      adminName: session.user.name || session.user.email || "Admin",
      action: "DELETE",
      entity: "BudgetTier",
      entityId: tier.id,
      metadata: { title: tier.title },
    });

    revalidateTag("homepage");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting budget tier:", error);
    return NextResponse.json(
      { error: "Failed to delete budget tier" },
      { status: 500 }
    );
  }
}
