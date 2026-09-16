import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VALID_TYPES = new Set(["VIEW", "ADD_TO_CART"]);

export async function POST(request: NextRequest) {
  // sendBeacon posts as text/plain; parse defensively either way.
  const raw = await request.text();
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { productId, type, sessionId, durationMs } = body as {
    productId?: string;
    type?: string;
    sessionId?: string;
    durationMs?: number;
  };

  if (!productId || !type || !sessionId || !VALID_TYPES.has(type)) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  // Ignore noise: a sub-second "view" is a bounce, not engagement worth
  // storing — keeps the table meaningful instead of growing with reload
  // blips and bot traffic.
  if (type === "VIEW" && typeof durationMs === "number" && durationMs < 1000) {
    return NextResponse.json({ success: true, skipped: true });
  }

  try {
    await prisma.productEvent.create({
      data: {
        productId,
        type: type as "VIEW" | "ADD_TO_CART",
        sessionId,
        durationMs: typeof durationMs === "number" ? Math.round(durationMs) : null,
      },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    // A deleted/invalid productId shouldn't surface as a user-facing error —
    // this is best-effort telemetry, not a critical write path.
    console.error("Analytics track failed:", error);
    return NextResponse.json({ success: false }, { status: 202 });
  }
}
