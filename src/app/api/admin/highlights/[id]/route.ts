import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { removePublicAsset } from "@/lib/imagekit-admin";
import {
  deleteHighlight,
  getHighlight,
  highlightInputSchema,
  updateHighlight,
} from "@/modules/marketing";

/** Everything stored for highlights lives under this prefix. */
const HIGHLIGHT_ASSET_PREFIX = "/assets/pictures/highlights/";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const parsed = highlightInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid highlight" },
        { status: 400 },
      );
    }

    const highlight = await updateHighlight(id, parsed.data);

    await logAudit({
      adminId: session.user.id,
      adminName: session.user.name ?? undefined,
      action: "UPDATE",
      entity: "Highlight",
      entityId: id,
      metadata: { title: highlight.title },
    });

    return NextResponse.json({ highlight });
  } catch (error) {
    console.error("Error updating highlight:", error);
    return NextResponse.json({ error: "Failed to update highlight" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Read first, so the media paths are known once the row is gone.
    const highlight = await getHighlight(id);
    if (!highlight) {
      return NextResponse.json({ error: "Highlight not found" }, { status: 404 });
    }

    await deleteHighlight(id);

    // Its media goes with it, but only media this app uploaded — a highlight
    // pointed at somebody else's URL must not cause a delete attempt there.
    for (const assetPath of [highlight.mediaUrl, highlight.posterUrl]) {
      if (!assetPath?.startsWith(HIGHLIGHT_ASSET_PREFIX)) continue;
      try {
        await removePublicAsset(assetPath);
      } catch (error) {
        // The row is already gone; a stranded file is not worth failing on.
        console.error("Failed to remove highlight media:", error);
      }
    }

    await logAudit({
      adminId: session.user.id,
      adminName: session.user.name ?? undefined,
      action: "DELETE",
      entity: "Highlight",
      entityId: id,
      metadata: { title: highlight.title },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting highlight:", error);
    return NextResponse.json({ error: "Failed to delete highlight" }, { status: 500 });
  }
}
