import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import {
  createHighlight,
  highlightInputSchema,
  listHighlights,
} from "@/modules/marketing";

/**
 * The admin's collection of highlights.
 *
 * Both handlers are thin: validation is the module's schema and the writing
 * is the module's service, including dropping the caches the storefront
 * reads through. This route only decides who is allowed in and what the
 * response looks like.
 */

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session;
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json({ highlights: await listHighlights() });
  } catch (error) {
    console.error("Error fetching highlights:", error);
    return NextResponse.json({ error: "Failed to fetch highlights" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const parsed = highlightInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid highlight" },
        { status: 400 },
      );
    }

    const highlight = await createHighlight(parsed.data);

    await logAudit({
      adminId: session.user.id,
      adminName: session.user.name ?? undefined,
      action: "CREATE",
      entity: "Highlight",
      entityId: highlight.id,
      metadata: { title: highlight.title },
    });

    return NextResponse.json({ highlight }, { status: 201 });
  } catch (error) {
    console.error("Error creating highlight:", error);
    return NextResponse.json({ error: "Failed to create highlight" }, { status: 500 });
  }
}
