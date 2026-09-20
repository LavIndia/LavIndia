import type { ReactNode } from "react";
import { HeaderSection } from "@/components/layout/HeaderSection";
import { FooterSection } from "@/components/layout/FooterSection";
import { TopPromoBannerServer } from "@/components/home/TopPromoBannerServer";
import { BreadcrumbNavigation } from "@/components/layout/BreadcrumbNavigation";
import type { ContentPageCopy } from "@/modules/marketing";
import {
  breadcrumbWrapStyle,
  containerStyle,
  heroInnerStyle,
  heroIntroStyle,
  heroStyle,
  heroTitleStyle,
  listItemStyle,
  listStyle,
  pageStyle,
  paragraphStyle,
  sectionHeadingStyle,
  sectionStyle,
  updatedStyle,
} from "@/components/content/content.styles";

/**
 * Renders an editorial or policy page from its copy.
 *
 * Every such page on the storefront — the story, the core values, the FAQ and
 * the four policies — is the same document with different words in it, so
 * they share one shell. `children` is for the rare page that needs a live
 * element as well as prose; the contact page uses it to show the business
 * details that are held in site settings rather than in a copy file.
 */
export function ContentPage({
  copy,
  children,
}: {
  copy: ContentPageCopy;
  children?: ReactNode;
}) {
  return (
    <div className={pageStyle}>
      <TopPromoBannerServer />
      <HeaderSection />

      <div className={heroStyle}>
        <div className={heroInnerStyle}>
          <h1 className={heroTitleStyle}>{copy.title}</h1>
          {/* A label with nothing behind it is worse than no label, so the
              intro and the revision date only appear when they exist. */}
          {copy.intro ? <p className={heroIntroStyle}>{copy.intro}</p> : null}
          {copy.lastUpdated ? (
            <p className={updatedStyle}>Last updated {copy.lastUpdated}</p>
          ) : null}
        </div>
      </div>

      <main className={containerStyle}>
        <div className={breadcrumbWrapStyle}>
          <BreadcrumbNavigation currentLabel={copy.title} />
        </div>

        {children}

        {copy.sections.map((section) => (
          <section key={section.heading} className={sectionStyle}>
            <h2 className={sectionHeadingStyle}>{section.heading}</h2>
            {section.body?.map((paragraph, index) => (
              <p key={index} className={paragraphStyle}>
                {paragraph}
              </p>
            ))}
            {section.bullets?.length ? (
              <ul className={listStyle}>
                {section.bullets.map((bullet) => (
                  <li key={bullet} className={listItemStyle}>
                    {bullet}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </main>

      <FooterSection />
    </div>
  );
}
