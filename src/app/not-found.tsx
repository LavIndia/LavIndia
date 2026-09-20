import Link from "next/link";
import { HeaderSection } from "@/components/layout/HeaderSection";
import { FooterSection } from "@/components/layout/FooterSection";
import { css } from "styled-system/css";

/**
 * The storefront's 404.
 *
 * It exists because every unknown single-segment path used to fall through to
 * the catch-all category route, which answered with a "Category Not Found"
 * body and an HTTP 200 — so a mistyped URL looked like a real page to search
 * engines and to anything else reading the status code.
 */

const pageStyle = css({
  minHeight: "100vh",
  background: "bg.canvas",
  display: "flex",
  flexDirection: "column",
});

const mainStyle = css({
  flex: "1",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  paddingInline: "4",
  paddingBlock: "20",
});

const innerStyle = css({ maxWidth: "xl", textAlign: "center" });

const codeStyle = css({
  fontFamily: "display",
  fontSize: { base: "5xl", md: "6xl" },
  fontWeight: "bold",
  color: "accent.default",
  lineHeight: "1",
  marginBottom: "4",
});

const titleStyle = css({
  fontFamily: "display",
  fontSize: { base: "2xl", md: "3xl" },
  fontWeight: "bold",
  color: "fg.default",
  marginBottom: "3",
});

const bodyStyle = css({
  color: "fg.muted",
  fontSize: "md",
  lineHeight: "1.7",
  marginBottom: "8",
});

const actionsStyle = css({
  display: "flex",
  flexWrap: "wrap",
  gap: "3",
  justifyContent: "center",
});

const primaryLinkStyle = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  paddingInline: "6",
  paddingBlock: "3",
  borderRadius: "full",
  background: "accent.default",
  color: "fg.onGold",
  fontWeight: "semibold",
  boxShadow: "gold",
  transition: "background 0.15s ease",
  _hover: { background: "accent.hover" },
});

const secondaryLinkStyle = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  paddingInline: "6",
  paddingBlock: "3",
  borderRadius: "full",
  border: "1px solid",
  borderColor: "border.subtle",
  color: "fg.default",
  fontWeight: "medium",
  transition: "border-color 0.15s ease, color 0.15s ease",
  _hover: { borderColor: "accent.default", color: "accent.pressed" },
});

export default function NotFound() {
  return (
    <div className={pageStyle}>
      <HeaderSection />
      <main className={mainStyle}>
        <div className={innerStyle}>
          <p className={codeStyle}>404</p>
          <h1 className={titleStyle}>This page doesn&apos;t exist</h1>
          <p className={bodyStyle}>
            The page you were looking for may have been moved, or the piece it
            showed may no longer be available. Everything we currently make is
            still one click away.
          </p>
          <div className={actionsStyle}>
            <Link href="/shop" className={primaryLinkStyle}>
              Shop all jewellery
            </Link>
            <Link href="/" className={secondaryLinkStyle}>
              Back to home
            </Link>
            <Link href="/contact" className={secondaryLinkStyle}>
              Contact us
            </Link>
          </div>
        </div>
      </main>
      <FooterSection />
    </div>
  );
}
