"use client";

import { HeaderSection } from "@/components/layout/HeaderSection";
import { FooterSection } from "@/components/layout/FooterSection";
import TopPromoBanner from "@/components/home/TopPromoBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { XCircle, AlertTriangle, Mail } from "lucide-react";
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
  background: "rgba(138, 44, 59, 0.1)",
});
const iconStyle = css({ height: "16", width: "16", color: "danger" });
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
const contentGapStyle = css({ display: "flex", flexDirection: "column", gap: "4" });

const reasonBoxStyle = css({
  display: "flex",
  alignItems: "flex-start",
  gap: "2",
  padding: "3",
  background: "rgba(184, 147, 58, 0.08)",
  border: "1px solid",
  borderColor: "gold.200",
  borderRadius: "lg",
});
const reasonIconStyle = css({ height: "5", width: "5", color: "gold.600", marginTop: "0.5", flexShrink: 0 });
const reasonLabelStyle = css({ fontSize: "sm", fontWeight: "medium", color: "onyx.800" });
const reasonTextStyle = css({ fontSize: "sm", color: "onyx.600" });

const stepsWrapStyle = css({ display: "flex", flexDirection: "column", gap: "3" });
const stepTitleStyle = css({ fontWeight: "semibold", color: "fg.default", marginBottom: "1" });
const stepTextStyle = css({ fontSize: "sm", color: "fg.muted" });

const actionsRowStyle = css({ display: "flex", flexDirection: { base: "column", sm: "row" }, gap: "3" });
const actionBtnStyle = css({ flex: "1" });

const supportBoxStyle = css({
  marginTop: "6",
  padding: "4",
  background: "bg.surface",
  border: "1px solid",
  borderColor: "border.subtle",
  borderRadius: "lg",
});
const supportRowStyle = css({ display: "flex", alignItems: "flex-start", gap: "3" });
const supportIconStyle = css({ height: "5", width: "5", color: "fg.muted", marginTop: "0.5" });
const supportTitleStyle = css({ fontSize: "sm", fontWeight: "medium", color: "fg.default", marginBottom: "1" });
const supportTextStyle = css({ fontSize: "sm", color: "fg.muted" });
const supportLinkStyle = css({ color: "accent.pressed", "&:hover": { textDecoration: "underline" } });

function OrderFailedContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order");
  const reason =
    searchParams.get("reason") || "Payment was cancelled or failed";

  return (
    <div className={pageStyle}>
      <TopPromoBanner />
      <HeaderSection />
      <main className={mainStyle}>
        <div className={containerStyle}>
          {/* Failed Icon & Message */}
          <div className={heroStyle}>
            <div className={iconRowStyle}>
              <motion.div
                className={iconCircleStyle}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <XCircle className={iconStyle} />
              </motion.div>
            </div>
            <h1 className={heroTitleStyle}>Order Not Completed</h1>
            <p className={heroSubStyle}>
              We couldn&apos;t complete your order. Don&apos;t worry, no charges
              have been made to your account.
            </p>
          </div>

          {/* Order Details Card */}
          {orderNumber && (
            <Card className={cardSpacingStyle}>
              <CardHeader>
                <CardTitle>Order Information</CardTitle>
              </CardHeader>
              <CardContent className={contentGapStyle}>
                <div className={rowStyle}>
                  <span className={rowLabelStyle}>Order Number:</span>
                  <span className={rowMonoStyle}>{orderNumber}</span>
                </div>
                <div className={rowStyle}>
                  <span className={rowLabelStyle}>Status:</span>
                  <Badge variant="destructive">Payment Failed</Badge>
                </div>
                <div className={reasonBoxStyle}>
                  <AlertTriangle className={reasonIconStyle} />
                  <div>
                    <p className={reasonLabelStyle}>Reason</p>
                    <p className={reasonTextStyle}>{reason}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* What Can You Do */}
          <Card className={cardSpacingStyle}>
            <CardHeader>
              <CardTitle>What Can You Do?</CardTitle>
            </CardHeader>
            <CardContent className={contentGapStyle}>
              <div className={stepsWrapStyle}>
                <div>
                  <h3 className={stepTitleStyle}>1. Try Again</h3>
                  <p className={stepTextStyle}>
                    Return to your cart and try placing the order again. Your
                    items are still saved.
                  </p>
                </div>
                <div>
                  <h3 className={stepTitleStyle}>
                    2. Choose a Different Payment Method
                  </h3>
                  <p className={stepTextStyle}>
                    Try using a different payment method like Cash on Delivery
                    (COD) or a different card/UPI.
                  </p>
                </div>
                <div>
                  <h3 className={stepTitleStyle}>3. Contact Support</h3>
                  <p className={stepTextStyle}>
                    If you continue to face issues, our support team is here to
                    help.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className={actionsRowStyle}>
            <Button asChild className={actionBtnStyle}>
              <Link href="/checkout">Try Again</Link>
            </Button>
            <Button asChild variant="outline" className={actionBtnStyle}>
              <Link href="/">Continue Shopping</Link>
            </Button>
          </div>

          {/* Contact Support */}
          <div className={supportBoxStyle}>
            <div className={supportRowStyle}>
              <Mail className={supportIconStyle} />
              <div>
                <p className={supportTitleStyle}>Need Help?</p>
                <p className={supportTextStyle}>
                  Contact our support team at{" "}
                  <a href="mailto:support@lavishindia.com" className={supportLinkStyle}>
                    support@lavishindia.com
                  </a>{" "}
                  or call us at{" "}
                  <a href="tel:+911234567890" className={supportLinkStyle}>
                    +91 123 456 7890
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <FooterSection />
    </div>
  );
}

export default function OrderFailedPage() {
  return (
    <Suspense
      fallback={
        <div className={loadingPageStyle}>
          <p>Loading...</p>
        </div>
      }
    >
      <OrderFailedContent />
    </Suspense>
  );
}
