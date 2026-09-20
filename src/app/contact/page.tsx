import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentPage } from "@/components/content/ContentPage";
import { ContactDetails } from "@/components/content/ContactDetails";
import { getContentPage } from "@/modules/marketing";
import { getSiteSettings } from "@/lib/site-settings";

const SLUG = "contact";

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getContentPage(SLUG);
  return { title: copy?.title, description: copy?.intro };
}

export default async function ContactPage() {
  // Both are cached per request and across navigations, so this costs no
  // extra database round trip on top of the shared layout.
  const [copy, settings] = await Promise.all([
    getContentPage(SLUG),
    getSiteSettings(),
  ]);

  if (!copy) notFound();

  return (
    <ContentPage copy={copy}>
      <ContactDetails
        address={settings.address}
        contactNumber={settings.contactNumber}
        email={settings.email}
        gstNumber={settings.gstNumber}
      />
    </ContentPage>
  );
}
