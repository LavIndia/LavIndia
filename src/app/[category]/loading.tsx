import { HeaderSection } from "@/components/layout/HeaderSection";
import { FooterSection } from "@/components/layout/FooterSection";
import { Skeleton } from "@/components/ui/skeleton";
import { css } from "styled-system/css";

const pageStyle = css({ minHeight: "100vh", background: "bg.canvas" });

const containerStyle = css({
  maxWidth: "7xl",
  marginInline: "auto",
  paddingInline: "4",
});

const gridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", sm: "repeat(2, 1fr)", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
  gap: "6",
});

const cardImageStyle = css({
  aspectRatio: "1 / 1",
  width: "full",
  borderRadius: "lg",
});

export default function CategoryLoading() {
  return (
    <div className={pageStyle}>
      <HeaderSection />
      <main className={css({ paddingBlock: "8" })}>
        <div className={containerStyle}>
          <Skeleton className={css({ height: "8", width: "64", marginBottom: "4" })} />
          <Skeleton className={css({ height: "4", width: "96", marginBottom: "8" })} />
          <div
            className={css({
              display: "flex",
              flexDirection: "column",
              gap: "6",
              lg: { flexDirection: "row", gap: "8", alignItems: "flex-start" },
            })}
          >
            <Skeleton
              className={css({
                width: "full",
                lg: { width: "64" },
                height: "80",
                borderRadius: "lg",
                flexShrink: "0",
              })}
            />
            <div className={css({ flex: "1", minWidth: "0" })}>
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
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className={css({ display: "flex", flexDirection: "column", gap: "3.5" })}>
                    <Skeleton className={cardImageStyle} />
                    <Skeleton className={css({ height: "4", width: "75%" })} />
                    <Skeleton className={css({ height: "4", width: "40%" })} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
