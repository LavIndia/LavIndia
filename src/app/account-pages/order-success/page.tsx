"use client";

import { HeaderSection } from "@/components/layout/HeaderSection";
import { FooterSection } from "@/components/layout/FooterSection";
import TopPromoBanner from "@/components/home/TopPromoBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Package, Truck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { css } from "styled-system/css";
import { motion } from "motion/react";

const pageStyle = css({ minHeight: "100vh", background: "bg.canvas" });
const loadingPageStyle = css({ minHeight: "100vh", background: "bg.canvas", display: "flex", alignItems: "center", justifyContent: "center" });
const mainStyle = css({ paddingBlock: { base: "8", md: "12" } });
const containerStyle = css({ maxWidth: "3xl", marginInline: "auto", paddingInline: { base: "4", md: "6" } });

const heroStyle = css({ textAlign: "center", marginBottom: "8" });
const iconRowStyle = css({ display: "flex", justifyContent: "center", marginBottom: "4" });
const iconCircleStyle = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "full",
  padding: "6",
  background: "linear-gradient(135deg, {colors.gold.100}, {colors.gold.50})",
  boxShadow: "gold",
});
const iconStyle = css({ height: "16", width: "16", color: "success" });
const heroTitleStyle = css({
  fontFamily: "display",
  fontSize: { base: "2xl", md: "3xl" },
  fontWeight: "bold",
  color: "fg.default",
  marginBottom: "2",
});
const heroSubStyle = css({ color: "fg.muted" });

const cardSpacingStyle = css({ marginBottom: "6" });
const rowStyle = css({ display: "flex", alignItems: "center", justifyContent: "space-between" });
const rowLabelStyle = css({ color: "fg.muted" });
const rowMonoStyle = css({ fontFamily: "mono", fontWeight: "semibold", color: "fg.default" });
const rowValueStyle = css({ fontWeight: "medium", color: "fg.default" });
const contentGapStyle = css({ display: "flex", flexDirection: "column", gap: "4" });

const stepRowStyle = css({ display: "flex", alignItems: "flex-start", gap: "4" });
const stepIconWrapStyle = css({ borderRadius: "full", padding: "2", marginTop: "1", background: "gold.50" });
const stepIconStyle = css({ height: "5", width: "5", color: "accent.pressed" });
const stepTitleStyle = css({ fontWeight: "semibold", color: "fg.default", marginBottom: "1" });
const stepTextStyle = css({ fontSize: "sm", color: "fg.muted" });

const actionsRowStyle = css({ display: "flex", flexDirection: { base: "column", sm: "row" }, gap: "3" });
const actionBtnStyle = css({ flex: "1" });

const noteBoxStyle = css({
  marginTop: "6",
  padding: "4",
  background: "bg.glass",
  backdropBlur: "glassSm",
  border: "1px solid",
  borderColor: "border.glass",
  borderRadius: "lg",
});
const noteTextStyle = css({ fontSize: "sm", color: "fg.default" });

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order");

  return (
    <div className={pageStyle}>
      <TopPromoBanner />
      <HeaderSection />
      <main className={mainStyle}>
        <div className={containerStyle}>
          {/* Success Icon & Message */}
          <div className={heroStyle}>
            <div className={iconRowStyle}>
              <motion.div
                className={iconCircleStyle}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <CheckCircle2 className={iconStyle} />
              </motion.div>
            </div>
            <h1 className={heroTitleStyle}>Order Placed Successfully!</h1>
            <p className={heroSubStyle}>
              Thank you for your order. We&apos;ve received your order and will
              begin processing it shortly.
            </p>
          </div>

          {/* Order Details Card */}
          <Card className={cardSpacingStyle}>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent className={contentGapStyle}>
              <div className={rowStyle}>
                <span className={rowLabelStyle}>Order Number:</span>
                <span className={rowMonoStyle}>{orderNumber || "N/A"}</span>
              </div>
              <div className={rowStyle}>
                <span className={rowLabelStyle}>Status:</span>
                <Badge className={css({ background: "success", color: "white" })}>
                  Order Confirmed
                </Badge>
              </div>
              <div className={rowStyle}>
                <span className={rowLabelStyle}>Estimated Delivery:</span>
                <span className={rowValueStyle}>
                  {new Date(
                    Date.now() + 7 * 24 * 60 * 60 * 1000
                  ).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* What's Next */}
          <Card className={cardSpacingStyle}>
            <CardHeader>
              <CardTitle>What&apos;s Next?</CardTitle>
            </CardHeader>
            <CardContent className={contentGapStyle}>
              <div className={stepRowStyle}>
                <div className={stepIconWrapStyle}>
                  <Package className={stepIconStyle} />
                </div>
                <div>
                  <h3 className={stepTitleStyle}>Order Processing</h3>
                  <p className={stepTextStyle}>
                    Your order is being prepared and will be dispatched soon.
                  </p>
                </div>
              </div>
              <div className={stepRowStyle}>
                <div className={stepIconWrapStyle}>
                  <Truck className={stepIconStyle} />
                </div>
                <div>
                  <h3 className={stepTitleStyle}>Track Your Order</h3>
                  <p className={stepTextStyle}>
                    You can track your order status and shipment details from
                    your profile.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className={actionsRowStyle}>
            <Button asChild className={actionBtnStyle}>
              <Link href="/orders">View Order Status</Link>
            </Button>
            <Button asChild variant="outline" className={actionBtnStyle}>
              <Link href="/">Continue Shopping</Link>
            </Button>
          </div>

          {/* Confirmation Email Note */}
          <div className={noteBoxStyle}>
            <p className={noteTextStyle}>
              <strong>Note:</strong> A confirmation email has been sent to your
              registered email address with order details.
            </p>
          </div>
        </div>
      </main>
      <FooterSection />
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className={loadingPageStyle}>
          <p>Loading...</p>
        </div>
      }
    >
      <OrderSuccessContent />
    </Suspense>
  );
}
