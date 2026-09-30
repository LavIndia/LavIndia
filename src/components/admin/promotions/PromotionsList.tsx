"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { css, cx } from "styled-system/css";
import { formatPaisaCompact } from "@/modules/_shared/money";
import type { PromotionStatus } from "@/modules/promotions/mapping";
import { PromotionActions } from "./PromotionActions";

export interface PromotionListItem {
  id: string;
  name: string;
  title: string;
  summary: string;
  status: PromotionStatus;
  trigger: "AUTOMATIC" | "CODE";
  code: string | null;
  channels: string[];
  startsAt: string | null;
  endsAt: string | null;
  usedCount: number;
  usageLimit: number | null;
  discountGivenCents: number;
}

const TABS: Array<{ key: PromotionStatus | "ALL"; label: string }> = [
  { key: "LIVE", label: "Live" },
  { key: "SCHEDULED", label: "Scheduled" },
  { key: "PAUSED", label: "Paused" },
  { key: "DRAFT", label: "Drafts" },
  { key: "ENDED", label: "Ended" },
  { key: "ARCHIVED", label: "Archived" },
  { key: "ALL", label: "All" },
];

const STATUS_LABEL: Record<PromotionStatus, string> = {
  LIVE: "Live",
  SCHEDULED: "Scheduled",
  PAUSED: "Paused",
  DRAFT: "Draft",
  ENDED: "Ended",
  ARCHIVED: "Archived",
};

const chip = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "1.5",
  borderRadius: "full",
  paddingInline: "2.5",
  paddingBlock: "0.5",
  fontSize: "xs",
  fontWeight: "medium",
  border: "1px solid",
  whiteSpace: "nowrap",
});
const chipTone: Record<PromotionStatus, string> = {
  LIVE: css({ color: "success", borderColor: "success" }),
  SCHEDULED: css({ color: "gold.700", borderColor: "gold.400", _dark: { color: "gold.200" } }),
  PAUSED: css({ color: "fg.muted", borderColor: "onyx.200" }),
  DRAFT: css({ color: "fg.muted", borderColor: "border.subtle", borderStyle: "dashed" }),
  ENDED: css({ color: "fg.muted", borderColor: "border.subtle" }),
  ARCHIVED: css({ color: "fg.muted", borderColor: "border.subtle" }),
};

const tabStyle = (active: boolean) =>
  css({
    borderRadius: "full",
    paddingInline: "3",
    paddingBlock: "1.5",
    fontSize: "sm",
    border: "1px solid",
    borderColor: active ? "accent.default" : "border.subtle",
    background: active ? "gold.50" : "bg.surface",
    color: "fg.default",
    cursor: "pointer",
    whiteSpace: "nowrap",
    _dark: { background: active ? "bg.canvas" : "bg.surface" },
  });

const rowStyle = css({
  display: "grid",
  gridTemplateColumns: { base: "1fr auto", md: "minmax(0, 1fr) 11rem 9rem auto" },
  alignItems: "center",
  gap: { base: "2", md: "4" },
  padding: "4",
  borderBottom: "1px solid",
  borderColor: "border.subtle",
  _last: { borderBottom: "none" },
});
const muted = css({ fontSize: "sm", color: "fg.muted" });

function when(item: PromotionListItem): string {
  const date = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  if (item.status === "SCHEDULED" && item.startsAt) return `Starts ${date(item.startsAt)}`;
  if (item.endsAt) return item.status === "ENDED" ? `Ended ${date(item.endsAt)}` : `Until ${date(item.endsAt)}`;
  return item.status === "LIVE" ? "No end date" : "";
}

export function PromotionsList({ items }: { items: PromotionListItem[] }) {
  const [tab, setTab] = useState<PromotionStatus | "ALL">(
    items.some((i) => i.status === "LIVE") ? "LIVE" : "ALL",
  );
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) map.set(item.status, (map.get(item.status) ?? 0) + 1);
    return map;
  }, [items]);
  const shown = items.filter((i) => (tab === "ALL" ? i.status !== "ARCHIVED" : i.status === tab));

  return (
    <div className={css({ display: "flex", flexDirection: "column", gap: "4" })}>
      <div className={css({ display: "flex", gap: "2", overflowX: "auto", paddingBottom: "1" })}>
        {TABS.map((t) => (
          <button key={t.key} type="button" className={tabStyle(tab === t.key)} onClick={() => setTab(t.key)}>
            {t.label}
            {t.key !== "ALL" && counts.get(t.key) ? ` ${counts.get(t.key)}` : ""}
          </button>
        ))}
      </div>

      <div
        className={css({
          borderRadius: "xl",
          border: "1px solid",
          borderColor: "border.subtle",
          background: "bg.surface",
        })}
      >
        {shown.length === 0 ? (
          <div className={css({ padding: "10", textAlign: "center", display: "flex", flexDirection: "column", gap: "3", alignItems: "center" })}>
            <p className={muted}>No offers here yet.</p>
            <Link href="/admin/promotions/new" className={css({ color: "accent.default", fontWeight: "medium" })}>
              Create an offer
            </Link>
          </div>
        ) : (
          shown.map((item) => (
            <div key={item.id} className={rowStyle}>
              <Link
                href={`/admin/promotions/${item.id}`}
                className={css({ display: "flex", flexDirection: "column", gap: "1", minWidth: 0, textDecoration: "none" })}
              >
                <span className={css({ fontWeight: "semibold", color: "fg.default" })}>
                  {item.title}
                  {item.code && (
                    <span className={css({ fontFamily: "mono", fontSize: "xs", marginLeft: "2", color: "fg.muted" })}>
                      {item.code}
                    </span>
                  )}
                </span>
                <span className={cx(muted, css({ overflow: "hidden", textOverflow: "ellipsis" }))}>{item.summary}</span>
                <span className={css({ fontSize: "xs", color: "fg.muted" })}>
                  {item.name} · {item.trigger === "CODE" ? "With a code" : "Automatic"} ·{" "}
                  {item.channels.length === 2 ? "Online + In store" : item.channels[0] === "ONLINE" ? "Online" : "In store"}
                </span>
              </Link>
              <div className={css({ display: { base: "none", md: "flex" }, flexDirection: "column", alignItems: "flex-start", gap: "1" })}>
                <span className={cx(chip, chipTone[item.status])}>{STATUS_LABEL[item.status]}</span>
                <span className={css({ fontSize: "xs", color: "fg.muted" })}>{when(item)}</span>
              </div>
              <div className={css({ display: { base: "none", md: "flex" }, flexDirection: "column", gap: "0.5", fontVariantNumeric: "tabular-nums" })}>
                <span className={css({ fontSize: "sm" })}>
                  {item.usedCount}
                  {item.usageLimit ? ` / ${item.usageLimit}` : ""} orders
                </span>
                <span className={css({ fontSize: "xs", color: "fg.muted" })}>
                  {formatPaisaCompact(item.discountGivenCents)} given
                </span>
              </div>
              <div className={css({ display: "flex", alignItems: "center", gap: "2" })}>
                <span className={cx(chip, chipTone[item.status], css({ display: { base: "inline-flex", md: "none" } }))}>
                  {STATUS_LABEL[item.status]}
                </span>
                <PromotionActions id={item.id} status={item.status} canDelete={item.usedCount === 0} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
