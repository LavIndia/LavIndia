"use client";

import { useState } from "react";
import { Ticket } from "lucide-react";
import { toast } from "sonner";
import { CouponCard } from "@/components/home/coupons/CouponCard";
import { css } from "styled-system/css";

/**
 * The offers currently running.
 *
 * Rebuilt as tickets. The previous cards stacked a title, a description, a
 * labelled code box, a copy button and a footer rule into roughly 230px
 * each, which on a phone meant two offers filled the screen and none of them
 * looked like something a house of this kind would hand you. A ticket says
 * the same things in a third of the height, and the saving is legible from
 * across the page.
 *
 * The heading matches the other bands — icon badge, left aligned — rather
 * than being centred on its own.
 */

interface Discount {
  id: string;
  code: string;
  title: string;
  description: string | null;
  discountType: string;
  discountValue: number;
  minPurchase: number | null;
  endDate: string | Date;
}

const sectionStyle = css({
  paddingY: "12",
  md: { paddingY: "16" },
  background: "linear-gradient(135deg, {colors.ivory.100}, {colors.gold.50})",
});
const containerStyle = css({ marginX: "auto", paddingX: "4", maxWidth: "6xl" });
const headerStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "3",
  marginBottom: "6",
  md: { marginBottom: "8" },
});
const badgeStyle = css({
  padding: "3",
  borderRadius: "full",
  background: "linear-gradient(135deg, {colors.gold.300}, {colors.gold.500})",
  color: "fg.onGold",
  boxShadow: "gold",
  display: "inline-flex",
  flexShrink: 0,
});
const headingStyle = css({
  fontFamily: "display",
  fontSize: "2xl",
  md: { fontSize: "3xl" },
  fontWeight: "semibold",
  color: "fg.default",
});
const subheadingStyle = css({ color: "fg.muted", marginTop: "1", fontSize: "sm" });
const gridStyle = css({
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "3",
  md: { gridTemplateColumns: "repeat(2, 1fr)", gap: "4" },
});

/** Rupee amounts are stored in paise and read better grouped Indian-style. */
function rupees(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function formatSaving(type: string, value: number) {
  return type === "PERCENTAGE" ? `${value}%` : rupees(value);
}

/**
 * The qualifying spend and the expiry, joined only where they exist — a
 * coupon with neither shows no line at all rather than an empty one.
 */
function formatMeta(coupon: Discount) {
  const parts: string[] = [];
  if (coupon.minPurchase) parts.push(`On orders over ${rupees(coupon.minPurchase)}`);

  const endsOn = new Date(coupon.endDate);
  if (!Number.isNaN(endsOn.getTime())) {
    parts.push(
      `Until ${endsOn.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}`,
    );
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

export function CouponsSection({
  coupons,
  title = "Coupons for You",
}: {
  coupons: Discount[];
  title?: string;
}) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success(`${code} copied`);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // Clipboard access can be refused; the code is on screen either way,
      // so this says so rather than failing silently.
      toast.error("Could not copy — the code is shown on the card");
    }
  };

  if (coupons.length === 0) return null;

  return (
    <section className={sectionStyle}>
      <div className={containerStyle}>
        <div className={headerStyle}>
          <span className={badgeStyle}>
            <Ticket className={css({ height: "6", width: "6" })} />
          </span>
          <div>
            <h2 className={headingStyle}>{title}</h2>
            <p className={subheadingStyle}>Applied at checkout</p>
          </div>
        </div>

        <div className={gridStyle}>
          {coupons.map((coupon) => (
            <CouponCard
              key={coupon.id}
              title={coupon.title}
              description={coupon.description}
              code={coupon.code}
              saving={formatSaving(coupon.discountType, coupon.discountValue)}
              meta={formatMeta(coupon)}
              copied={copiedCode === coupon.code}
              onCopy={() => copyCode(coupon.code)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
