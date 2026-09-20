import { notFound } from "next/navigation";
import { ContentPageForm } from "@/components/admin/content-pages/ContentPageForm";
import { getContentPageForEditing } from "@/modules/marketing";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EditContentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Returns the stored version if there is one, otherwise the draft the site
  // ships with — so the editor always opens on real words.
  const page = await getContentPageForEditing(slug);
  if (!page) notFound();

  return <ContentPageForm slug={slug} href={`/${slug}`} initial={page} />;
}
