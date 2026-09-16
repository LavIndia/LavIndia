import { HeaderSection } from "@/components/layout/HeaderSection";
import { FooterSection } from "@/components/layout/FooterSection";
import TopPromoBanner from "@/components/home/TopPromoBanner";
import { Skeleton } from "@/components/ui/skeleton";
import { css } from "styled-system/css";

const pageStyle = css({ minHeight: "100vh", background: "bg.canvas" });
const containerStyle = css({
  maxWidth: "5xl",
  marginInline: "auto",
  paddingInline: "4",
  paddingBlock: "10",
});

export default function ProfileLoading() {
  return (
    <div className={pageStyle}>
      <TopPromoBanner />
      <HeaderSection />
      <main>
        <div className={containerStyle}>
          <div className={css({ display: "flex", alignItems: "center", gap: "4", marginBottom: "8" })}>
            <Skeleton className={css({ h: "20", w: "20", borderRadius: "full" })} />
            <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
              <Skeleton className={css({ h: "6", w: "48" })} />
              <Skeleton className={css({ h: "4", w: "36" })} />
            </div>
          </div>
          <Skeleton className={css({ h: "10", w: "full", maxWidth: "md", marginBottom: "6", borderRadius: "md" })} />
          <div className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className={css({ h: "32", w: "full", borderRadius: "lg" })} />
            ))}
          </div>
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
