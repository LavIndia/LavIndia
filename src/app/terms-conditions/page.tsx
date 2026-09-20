import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentPage } from "@/components/content/ContentPage";
import { getContentPage } from "@/modules/marketing";

// The admin-editable copy lives under this slug; the draft shipped in
// src/content/ is the fallback when nothing has been saved.
const SLUG = "terms-conditions";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getContentPage(SLUG);
  return { title: copy?.title, description: copy?.intro };
}

export default async function TermsConditionsPage() {
  const copy = await getContentPage(SLUG);
  if (!copy) notFound();

  return <ContentPage copy={copy} />;
}
