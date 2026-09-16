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

export default function OrdersLoading() {
  return (
    <div className={pageStyle}>
      <TopPromoBanner />
      <HeaderSection />
      <main>
        <div className={containerStyle}>
          <Skeleton className={css({ h: "10", w: "48", marginBottom: "6" })} />
          <div className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className={css({ h: "64", w: "full", borderRadius: "lg" })} />
            ))}
          </div>
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
