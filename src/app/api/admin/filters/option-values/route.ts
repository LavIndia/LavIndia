import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Curated value lists for the product Options & Variants picker, sourced
// from the same admin-managed Filter/FilterOption records used for
// shop-page filtering — so a Color chip picked here and a Color filter
// customers see on the shop are always the same list, admin-editable in
// one place (/admin/filters).
const DIMENSION_SLUGS: Record<string, string> = {
  color: "color",
  size: "size",
  material: "material",
};

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const filters = await prisma.filter.findMany({
      where: { slug: { in: Object.values(DIMENSION_SLUGS) } },
      include: { options: { orderBy: { order: "asc" } } },
    });

    const bySlug = new Map(filters.map((f) => [f.slug, f]));
    const result: Record<string, { label: string; value: string; color: string | null }[]> = {};

    for (const [dimension, slug] of Object.entries(DIMENSION_SLUGS)) {
      const filter = bySlug.get(slug);
      result[dimension] = (filter?.options ?? []).map((opt) => ({
        label: opt.label,
        value: opt.value,
        color: opt.color,
      }));
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching option values:", error);
    return NextResponse.json(
      { error: "Failed to fetch option values" },
      { status: 500 },
    );
  }
}
