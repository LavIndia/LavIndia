"use client";

import { useState } from "react";
import { Ticket, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { css } from "styled-system/css";

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

const containerStyle = css({ marginX: "auto", paddingX: "4" });
const innerStyle = css({ maxWidth: "4xl", marginX: "auto" });
const headerStyle = css({ textAlign: "center", marginBottom: "8", md: { marginBottom: "10" } });
const headerTopStyle = css({ display: "inline-flex", alignItems: "center", gap: "2", marginBottom: "4" });
const headingStyle = css({ fontFamily: "display", fontSize: "2xl", md: { fontSize: "3xl" }, fontWeight: "semibold", color: "fg.default" });
const subheadingStyle = css({ color: "fg.muted" });

const gridStyle = css({
  display: "grid",
  gridTemplateColumns: "1fr",
  md: { gridTemplateColumns: "repeat(2, 1fr)" },
  gap: "5",
});

const cardStyle = css({
  position: "relative",
  background: "bg.surface",
  borderRadius: "lg",
  boxShadow: "card",
  overflow: "hidden",
  border: "1px dashed",
  borderColor: "gold.200",
  transition: "box-shadow 0.2s ease",
  "&:hover": { boxShadow: "glass" },
});

const cardBodyStyle = css({ padding: "6", position: "relative" });
const cardTopRowStyle = css({ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "3", marginBottom: "4" });
const couponTitleStyle = css({ fontWeight: "bold", fontSize: "lg", color: "fg.default", marginBottom: "1" });
const couponDescStyle = css({ fontSize: "sm", color: "fg.muted" });

const discountBadgeStyle = css({
  background: "linear-gradient(135deg, {colors.gold.300}, {colors.gold.500})",
  color: "fg.onGold",
  fontWeight: "bold",
  paddingX: "4",
  paddingY: "2",
  borderRadius: "md",
  fontSize: "sm",
  boxShadow: "gold",
  flexShrink: "0",
  whiteSpace: "nowrap",
});

const codeRowStyle = css({ display: "flex", alignItems: "center", gap: "3" });
const codeBoxStyle = css({
  flex: "1",
  background: "ivory.200",
  borderRadius: "md",
  paddingX: "4",
  paddingY: "3",
  border: "1px dashed",
  borderColor: "border.subtle",
});
const codeLabelStyle = css({ fontSize: "xs", color: "fg.muted", marginBottom: "1" });
const codeTextStyle = css({ fontFamily: "mono", fontWeight: "bold", fontSize: "lg", color: "fg.default" });

const footerRowStyle = css({
  marginTop: "4",
  paddingTop: "4",
  borderTop: "1px solid",
  borderColor: "border.subtle",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  fontSize: "xs",
  color: "fg.muted",
  flexWrap: "wrap",
  gap: "2",
});

export function CouponsSection({
  coupons,
  title = "Coupons for You",
}: {
  coupons: Discount[];
  title?: string;
}) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("Coupon code copied!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const formatDiscount = (type: string, value: number) => {
    if (type === "PERCENTAGE") {
      return `${value}% OFF`;
    }
    return `₹${value / 100} OFF`;
  };

  if (coupons.length === 0) {
    return null;
  }

  return (
    <section className={sectionStyle}>
      <div className={containerStyle}>
        <div className={innerStyle}>
          <div className={headerStyle}>
            <div className={headerTopStyle}>
              <Ticket className={css({ height: "8", width: "8", color: "accent.pressed" })} />
              <h2 className={headingStyle}>{title}</h2>
            </div>
            <p className={subheadingStyle}>Save more with our exclusive discount codes</p>
          </div>

          <div className={gridStyle}>
            {coupons.map((coupon) => (
              <div key={coupon.id} className={cardStyle}>
                <div className={cardBodyStyle}>
                  <div className={cardTopRowStyle}>
                    <div>
                      <h3 className={couponTitleStyle}>{coupon.title}</h3>
                      {coupon.description && (
                        <p className={couponDescStyle}>{coupon.description}</p>
                      )}
                    </div>
                    <span className={discountBadgeStyle}>
                      {formatDiscount(coupon.discountType, coupon.discountValue)}
                    </span>
                  </div>

                  <div className={codeRowStyle}>
                    <div className={codeBoxStyle}>
                      <p className={codeLabelStyle}>Coupon Code</p>
                      <p className={codeTextStyle}>{coupon.code}</p>
                    </div>
                    <Button onClick={() => copyCode(coupon.code)}>
                      {copiedCode === coupon.code ? (
                        <>
                          <Check className={css({ height: "4", width: "4" })} />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className={css({ height: "4", width: "4" })} />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>

                  <div className={footerRowStyle}>
                    {coupon.minPurchase && (
                      <span>Min. purchase: ₹{coupon.minPurchase / 100}</span>
                    )}
                    <span>
                      Valid till: {new Date(coupon.endDate).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
