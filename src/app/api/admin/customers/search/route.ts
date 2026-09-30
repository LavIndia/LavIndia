/**
 * Finds clients by name, mobile or email — or looks up known ids — for
 * offers meant for chosen clients only.
 */
import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { requireAdmin } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";

const SELECT = { id: true, name: true, mobile: true, email: true } as const;

export const GET = apiHandler(async (req: NextRequest) => {
  await requireAdmin("catalog:write");
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const ids = req.nextUrl.searchParams.get("ids")?.split(",").filter(Boolean) ?? [];

  if (ids.length) {
    const clients = await prisma.user.findMany({ where: { id: { in: ids.slice(0, 200) } }, select: SELECT });
    return NextResponse.json({ clients });
  }
  if (q.length < 2) return NextResponse.json({ clients: [] });

  const clients = await prisma.user.findMany({
    where: {
      role: "CUSTOMER",
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { mobile: { contains: q } },
      ],
    },
    select: SELECT,
    take: 10,
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ clients });
});
