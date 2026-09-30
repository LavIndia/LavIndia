import { notFound } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { PieceSetScreen } from "@/components/admin/promotions/PieceSetScreen";
import { emptySet, type PieceSetDraft } from "@/components/admin/promotions/PieceSetEditor";
import { pieceRuleSchema, setUsage } from "@/modules/promotions";
import { loadEditorData } from "../../editor-data";

export const dynamic = "force-dynamic";

export default async function PieceSetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [data, usage] = await Promise.all([loadEditorData(), setUsage()]);

  let initial: PieceSetDraft = emptySet();
  if (id !== "new") {
    const row = await prisma.pieceSet.findUnique({ where: { id } });
    if (!row) notFound();
    const rules = z.array(pieceRuleSchema).safeParse(row.rules);
    initial = {
      id: row.id,
      name: row.name,
      description: row.description,
      match: row.match === "ANY" ? "ANY" : "ALL",
      rules: rules.success ? rules.data : [],
      includeProductIds: row.includeProductIds,
      excludeProductIds: row.excludeProductIds,
    };
  }
  const users = usage.get(id) ?? [];
  return (
    <PieceSetScreen
      initial={initial}
      options={data.options}
      usedByLive={users.filter((u) => u.live).map((u) => u.name)}
      usedByAny={users.length}
    />
  );
}
