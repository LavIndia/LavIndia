import { notFound } from "next/navigation";
import { getHighlight } from "@/modules/marketing";
import { HighlightForm } from "@/components/admin/highlights/HighlightForm";

export const dynamic = "force-dynamic";

export default async function EditHighlightPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const highlight = await getHighlight(id);

  if (!highlight) notFound();

  return <HighlightForm highlight={highlight} />;
}
