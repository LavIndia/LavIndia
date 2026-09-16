"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu } from "./menu";
import { Navigation } from "./Navigation";
import { SearchIcon } from "./searchicon";
import CartSheet from "@/components/cart/CartSheet";
import { UserMenu } from "@/components/auth/UserMenu";
import { AdminModeToggle } from "./AdminModeToggle";
import { useSiteSettings } from "@/components/providers/SiteSettingsProvider";
import { css } from "styled-system/css";

const headerStyle = css({
  position: "sticky",
  top: 0,
  zIndex: "50",
  width: "full",
  background: "bg.glass",
  backdropBlur: "glass",
  borderBottom: "1px solid",
  borderColor: "border.glass",
  boxShadow: "glass",
});

const barStyle = css({
  maxWidth: "1440px",
  marginInline: "auto",
  display: "flex",
  height: { base: "16", md: "20" },
  alignItems: "center",
  justifyContent: "space-between",
  paddingInline: { base: "4", md: "6" },
  gap: "2",
});

const sideStyle = css({ display: "flex", alignItems: "center" });
const logoWrapStyle = css({
  flex: "1",
  minWidth: "0",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: "2",
});
const logoMarkStyle = css({
  display: "block",
  height: "8",
  width: "8",
  flexShrink: "0",
  objectFit: "contain",
});
const logoLinkStyle = css({ display: "flex", alignItems: "center", gap: "2" });
const logoWordmarkStyle = css({
  fontFamily: "display",
  fontWeight: "semibold",
  fontSize: { base: "lg", md: "xl" },
  color: "fg.default",
  letterSpacing: "wide",
  whiteSpace: "nowrap",
  textTransform: "capitalize",
});
const navSlotStyle = css({ display: { base: "none", md: "flex" } });
const actionsStyle = css({ display: "flex", alignItems: "center", gap: { base: "1", md: "3" } });

export function HeaderSection() {
  const { businessName } = useSiteSettings();

  return (
    <header className={headerStyle}>
      <div className={barStyle}>
        {/* Left side - Menu */}
        <div className={sideStyle}>
          <Menu />
        </div>

        {/* Center - Logo */}
        <div className={logoWrapStyle}>
          <Link href="/" className={logoLinkStyle}>
            <Image
              src="/name_logo.svg"
              alt=""
              width={40}
              height={40}
              className={logoMarkStyle}
              priority
            />
            <span className={logoWordmarkStyle}>{businessName}</span>
          </Link>
        </div>

        {/* Right side - Navigation, Search and Utility Links */}
        <div className={actionsStyle}>
          <div className={navSlotStyle}>
            <Navigation />
          </div>
          <SearchIcon />
          <AdminModeToggle />
          <UserMenu />
          <CartSheet />
        </div>
      </div>
    </header>
  );
}
