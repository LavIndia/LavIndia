import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { isDomainError, toErrorResponse } from "@/modules/_shared/errors";
import { readGatewayFailure } from "@/modules/payments/razorpay/gateway-error";
import { createPaymentLink, createPaymentQr, listPaymentLinks } from "@/modules/payments/razorpay/payment-links";

const createSchema = z.object({
  kind: z.enum(["LINK", "QR"]),
  expiryHours: z.number().int().min(1).max(168).optional(),
});

async function requireAdmin() {
  const session = await auth();
  return session?.user.role === "ADMIN" ? session : null;
}

// GET /api/admin/orders/[id]/payment-links — what has been sent for this order
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  return NextResponse.json({ links: await listPaymentLinks(id) });
}

// POST /api/admin/orders/[id]/payment-links — send a payment link or show a QR
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a payment link or a QR" }, { status: 400 });

  try {
    const { id } = await params;
    const link =
      parsed.data.kind === "LINK"
        ? await createPaymentLink(id, session.user.id, { expiryHours: parsed.data.expiryHours })
        : await createPaymentQr(id, session.user.id);
    return NextResponse.json({ link }, { status: 201 });
  } catch (error) {
    if (isDomainError(error)) {
      const { body, status } = toErrorResponse(error);
      return NextResponse.json(body, { status });
    }
    const failure = readGatewayFailure(error);
    console.error("Payment link creation failed:", failure.message);
    return NextResponse.json({ error: failure.message }, { status: failure.status === 401 ? 401 : 502 });
  }
}
