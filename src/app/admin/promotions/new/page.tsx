import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PromotionEditor } from "@/components/admin/promotions/PromotionEditor";
import { draftForTemplateId } from "@/components/admin/promotions/promotion-draft";
import { PROMOTION_TEMPLATES } from "@/modules/promotions";
import { css } from "styled-system/css";
import { loadEditorData } from "../editor-data";

export const dynamic = "force-dynamic";

const GROUPS = ["Sets & bundles", "Buy X get Y", "Price off", "Whole order", "Special"] as const;

const tile = css({
  display: "flex",
  flexDirection: "column",
  gap: "1",
  borderRadius: "xl",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
  padding: "4",
  textDecoration: "none",
  color: "fg.default",
  transition: "border-color 0.15s ease, transform 0.15s ease",
  _hover: { borderColor: "accent.default", transform: "translateY(-1px)" },
  _focusVisible: { outline: "2px solid", outlineColor: "accent.default" },
});

export default async function NewPromotionPage({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  const { template } = await searchParams;
  const draft = draftForTemplateId(template);

  if (draft) {
    const data = await loadEditorData();
    return <PromotionEditor initial={draft} {...data} />;
  }

  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "6" })}>
      <div className={css({ display: "flex", alignItems: "center", gap: "3" })}>
        <Button asChild variant="ghost" size="icon" aria-label="Back to offers">
          <Link href="/admin/promotions"><ArrowLeft className={css({ width: "4", height: "4" })} /></Link>
        </Button>
        <div>
          <h1 className={css({ fontFamily: "display", fontSize: { base: "2xl", md: "3xl" }, fontWeight: "bold" })}>What kind of offer?</h1>
          <p className={css({ fontSize: "sm", color: "fg.muted" })}>Pick the closest one — everything about it can be changed on the next page.</p>
        </div>
      </div>
      {GROUPS.map((group) => (
        <section key={group} className={css({ display: "flex", flexDirection: "column", gap: "3" })}>
          <h2 className={css({ fontSize: "xs", fontWeight: "semibold", letterSpacing: "0.08em", textTransform: "uppercase", color: "fg.muted" })}>{group}</h2>
          <div className={css({ display: "grid", gridTemplateColumns: { base: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }, gap: "3" })}>
            {PROMOTION_TEMPLATES.filter((t) => t.group === group).map((t) => (
              <Link key={t.id} href={`/admin/promotions/new?template=${t.id}`} className={tile}>
                <span className={css({ fontFamily: "display", fontSize: "lg", fontWeight: "semibold" })}>{t.name}</span>
                <span className={css({ fontSize: "sm", color: "fg.muted" })}>{t.hint}</span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
