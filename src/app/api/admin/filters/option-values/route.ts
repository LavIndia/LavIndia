import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { groupOptionsByDimension } from "@/modules/catalog";

// Curated value lists for the product Options & Variants picker, sourced
// from the same admin-managed Filter/FilterOption records used for
// shop-page filtering — so a Color chip picked here and a Color filter
// customers see on the shop are always the same list, admin-editable in
// one place (/admin/filters).
//
// Every active filter is read and the catalog module decides which variant
// dimension each one feeds. Matching on a fixed slug used to be the rule,
// which meant a filter an admin had sensibly called "Metal Colour" or
// "Chain Length" matched nothing and the picker offered no values at all.
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const filters = await prisma.filter.findMany({
      where: { isActive: true },
      select: {
        name: true,
        slug: true,
        options: {
          orderBy: { order: "asc" },
          select: { label: true, value: true, color: true },
        },
      },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(groupOptionsByDimension(filters));
  } catch (error) {
    console.error("Error fetching option values:", error);
    return NextResponse.json(
      { error: "Failed to fetch option values" },
      { status: 500 },
    );
  }
}
