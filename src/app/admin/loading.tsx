import { Skeleton } from "@/components/ui/skeleton";
import { css } from "styled-system/css";

const wrapStyle = css({ display: "flex", flexDirection: "column", gap: "6" });
const headerRowStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "3",
  sm: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
});
const headerTextStyle = css({ display: "flex", flexDirection: "column", gap: "2" });
const statsGridStyle = css({
  display: "grid",
  gap: "4",
  sm: { gridTemplateColumns: "repeat(2, 1fr)" },
  xl: { gridTemplateColumns: "repeat(4, 1fr)" },
});
const tableWrapStyle = css({
  overflow: "hidden",
  borderRadius: "xl",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
  boxShadow: "card",
  padding: "4",
});
const tableRowsStyle = css({ display: "flex", flexDirection: "column", gap: "3" });

export default function AdminLoading() {
  return (
    <div className={wrapStyle} aria-label="Loading admin page">
      <div className={headerRowStyle}>
        <div className={headerTextStyle}>
          <Skeleton className={css({ height: "8", width: "48" })} />
          <Skeleton className={css({ height: "4", width: "72", maxWidth: "full" })} />
        </div>
        <Skeleton className={css({ height: "9", width: "32" })} />
      </div>
      <div className={statsGridStyle}>
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className={css({ height: "28", borderRadius: "xl" })} />
        ))}
      </div>
      <div className={tableWrapStyle}>
        <div className={tableRowsStyle}>
          <Skeleton className={css({ height: "10", width: "full" })} />
          {Array.from({ length: 7 }, (_, index) => (
            <Skeleton key={index} className={css({ height: "12", width: "full" })} />
          ))}
        </div>
      </div>
    </div>
  );
}
