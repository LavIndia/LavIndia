import { HeaderSection } from "@/components/layout/HeaderSection";
import { FooterSection } from "@/components/layout/FooterSection";
import { Skeleton } from "@/components/ui/skeleton";
import { css } from "styled-system/css";

const gridStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr", md: "repeat(2, 1fr)", xl: "repeat(3, 1fr)" },
  gap: "6",
});

export default function RingsLoading() {
  return (
    <div className="min-h-screen bg-white">
      <HeaderSection />
      <div className={css({ maxWidth: "7xl", marginInline: "auto", paddingInline: "4", paddingBlock: "10" })}>
        <Skeleton className={css({ height: "8", width: "64", marginBottom: "8" })} />
        <div className={gridStyle}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={css({ display: "flex", flexDirection: "column", gap: "3.5" })}>
              <Skeleton className={css({ aspectRatio: "1 / 1", width: "full", borderRadius: "lg" })} />
              <Skeleton className={css({ height: "4", width: "75%" })} />
              <Skeleton className={css({ height: "4", width: "40%" })} />
            </div>
          ))}
        </div>
      </div>
      <FooterSection />
    </div>
  );
}
