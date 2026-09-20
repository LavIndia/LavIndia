import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import {
  contentPageInputSchema,
  getContentPageForEditing,
  saveContentPage,
} from "@/modules/marketing";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const page = await getContentPageForEditing(slug);
    if (!page) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ page });
  } catch (error) {
    console.error("Error loading content page:", error);
    return NextResponse.json(
      { error: "Failed to load the page" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;

    // The sections column is JSON, so this is the only thing standing between
    // a malformed save and a page the storefront has to render.
    const parsed = contentPageInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Please check the page before saving",
          issues: parsed.error.issues.map((issue) => issue.message),
        },
        { status: 400 },
      );
    }

    await saveContentPage(slug, parsed.data, session.user.id ?? null);

    await logAudit({
      adminId: session.user.id || "system",
      adminName: session.user.name || session.user.email || "Admin",
      action: "UPDATE",
      entity: "ContentPage",
      entityId: slug,
      metadata: {
        title: parsed.data.title,
        sections: parsed.data.sections.length,
        isPublished: parsed.data.isPublished,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error saving content page:", error);
    const message =
      error instanceof Error && error.message.includes("not an editable page")
        ? error.message
        : "Failed to save the page";
    const status = message.includes("not an editable page") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
