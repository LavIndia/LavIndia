import { HeaderSection } from "@/components/layout/HeaderSection";
import { FooterSection } from "@/components/layout/FooterSection";
import TopPromoBanner from "@/components/home/TopPromoBanner";
import { Skeleton } from "@/components/ui/skeleton";
import { css } from "styled-system/css";

const pageStyle = css({ minHeight: "100vh", background: "bg.canvas" });
const mainStyle = css({ paddingBlock: { base: "6", md: "10" } });
const containerStyle = css({
  maxWidth: "7xl",
  marginInline: "auto",
  paddingInline: { base: "4", md: "6" },
});

const gridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", lg: "1fr 1fr" },
  gap: { base: "6", lg: "10" },
});

const galleryColStyle = css({ display: "flex", flexDirection: "column", gap: "4" });
const carouselStyle = css({ width: "full", maxWidth: { base: "full", md: "md" }, marginInline: "auto" });
const imageBoxStyle = css({
  width: "full",
  aspectRatio: "1 / 1",
  borderRadius: "lg",
});

const thumbRowStyle = css({ display: "flex", gap: "2", justifyContent: "center" });
const thumbStyle = css({ width: "16", height: "16", borderRadius: "md" });

const infoColStyle = css({ display: "flex", flexDirection: "column", gap: "6" });

export default function ProductLoading() {
  return (
    <div className={pageStyle}>
      <TopPromoBanner />
      <HeaderSection />
      <main className={mainStyle}>
        <div className={containerStyle}>
          <Skeleton className={css({ height: "4", width: "64", marginBottom: "6" })} />
          <div className={gridStyle}>
            <div className={galleryColStyle}>
              <div className={carouselStyle}>
                <Skeleton className={imageBoxStyle} />
              </div>
              <div className={thumbRowStyle}>
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className={thumbStyle} />
                ))}
              </div>
            </div>
            <div className={infoColStyle}>
              <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
                <Skeleton className={css({ height: "9", width: "80%" })} />
                <Skeleton className={css({ height: "4", width: "50%" })} />
              </div>
              <Skeleton className={css({ height: "9", width: "40" })} />
              <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
                <Skeleton className={css({ height: "5", width: "24" })} />
                <div className={css({ display: "flex", gap: "2" })}>
                  {Array.from({ length: 3 }, (_, i) => (
                    <Skeleton key={i} className={css({ height: "9", width: "16", borderRadius: "full" })} />
                  ))}
                </div>
              </div>
              <Skeleton className={css({ height: "12", width: "full", borderRadius: "full" })} />
              <div className={css({ display: "flex", flexDirection: "column", gap: "2" })}>
                <Skeleton className={css({ height: "4", width: "full" })} />
                <Skeleton className={css({ height: "4", width: "full" })} />
                <Skeleton className={css({ height: "4", width: "60%" })} />
              </div>
            </div>
          </div>
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
