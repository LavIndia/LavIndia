import { HeaderSection } from "@/components/layout/HeaderSection";
import { FooterSection } from "@/components/layout/FooterSection";
import { Skeleton } from "@/components/ui/skeleton";
import { css } from "styled-system/css";

const pageStyle = css({ minHeight: "100vh", background: "bg.canvas" });

const heroStyle = css({
  background: "linear-gradient(135deg, {colors.onyx.800}, {colors.onyx.900})",
  paddingBlock: { base: "8", md: "12" },
});

const heroInnerStyle = css({
  maxWidth: "7xl",
  marginInline: "auto",
  paddingInline: "4",
});

const containerStyle = css({
  maxWidth: "7xl",
  marginInline: "auto",
  paddingInline: "4",
});

const gridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)", lg: "repeat(4, 1fr)" },
  gap: "6",
});

const cardImageStyle = css({
  aspectRatio: "1 / 1",
  width: "full",
  borderRadius: "lg",
});

export default function NewArrivalsLoading() {
  return (
    <div className={pageStyle}>
      <HeaderSection />
      <div className={heroStyle}>
        <div className={heroInnerStyle}>
          <Skeleton
            className={css({
              height: "6",
              width: "40",
              borderRadius: "full",
              background: "rgba(255,255,255,0.2)",
              marginBottom: "3",
            })}
          />
          <Skeleton
            className={css({
              height: "10",
              width: "72",
              maxWidth: "full",
              background: "rgba(255,255,255,0.2)",
              marginBottom: "3",
            })}
          />
          <Skeleton
            className={css({
              height: "5",
              width: "96",
              maxWidth: "full",
              background: "rgba(255,255,255,0.15)",
            })}
          />
        </div>
      </div>
      <main className={css({ paddingBlock: "8" })}>
        <div className={containerStyle}>
          <div
            className={css({
              marginBottom: "8",
              display: "flex",
              alignItems: "center",
              gap: "4",
            })}
          >
            <Skeleton className={css({ height: "4", width: "20" })} />
            <Skeleton className={css({ height: "9", width: "48", borderRadius: "md" })} />
          </div>
          <div className={gridStyle}>
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className={css({ display: "flex", flexDirection: "column", gap: "3.5" })}>
                <Skeleton className={cardImageStyle} />
                <Skeleton className={css({ height: "4", width: "75%" })} />
                <Skeleton className={css({ height: "4", width: "40%" })} />
              </div>
            ))}
          </div>
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
