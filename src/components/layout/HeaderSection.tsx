"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail, MapPin, Phone } from "lucide-react";
import { Menu } from "./menu";
import { Navigation } from "./Navigation";
import { SearchIcon } from "./searchicon";
import CartSheet from "@/components/cart/CartSheet";
import { UserMenu } from "@/components/auth/UserMenu";
import { AdminModeToggle } from "./AdminModeToggle";
import { useSiteSettings } from "@/components/providers/SiteSettingsProvider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  height: "9",
  width: "9",
  flexShrink: "0",
  objectFit: "contain",
});
const logoLinkStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "2.5",
  cursor: "pointer",
});
const logoWordmarkStyle = css({
  fontFamily: "display",
  fontWeight: "bold",
  fontSize: { base: "lg", md: "xl" },
  color: "fg.default",
  letterSpacing: "wider",
  whiteSpace: "nowrap",
  textTransform: "capitalize",
});
const contactRowStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "3",
  fontSize: "sm",
  color: "fg.default",
});
const contactIconStyle = css({
  height: "4",
  width: "4",
  flexShrink: "0",
  color: "accent.default",
});
const navSlotStyle = css({ display: { base: "none", md: "flex" } });
const actionsStyle = css({ display: "flex", alignItems: "center", gap: { base: "1", md: "3" } });

export function HeaderSection() {
  const { businessName, logoUrl, contactNumber, contactEmail, address } = useSiteSettings();
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [contactOpen, setContactOpen] = useState(false);

  const logoContent = (
    <>
      <Image
        /* The shop's own mark when one has been set, otherwise the bundled
           default — so the header is never left with a gap. */
        src={logoUrl || "/logo-mark.svg"}
        alt=""
        width={36}
        height={36}
        className={logoMarkStyle}
        priority
        unoptimized={Boolean(logoUrl)}
      />
      <span className={logoWordmarkStyle}>{businessName}</span>
    </>
  );

  return (
    <header className={headerStyle}>
      <div className={barStyle}>
        {/* Left side - Menu */}
        <div className={sideStyle}>
          <Menu />
        </div>

        {/* Center - Logo: goes home from anywhere else; on the homepage
            itself there's nowhere further to go, so it surfaces contact
            info instead. */}
        <div className={logoWrapStyle}>
          {isHome ? (
            <button
              type="button"
              onClick={() => setContactOpen(true)}
              className={logoLinkStyle}
              aria-label={`Contact ${businessName}`}
            >
              {logoContent}
            </button>
          ) : (
            <Link href="/" className={logoLinkStyle}>
              {logoContent}
            </Link>
          )}
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

      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact {businessName}</DialogTitle>
          </DialogHeader>
          <div className={css({ display: "flex", flexDirection: "column", gap: "3", paddingTop: "2" })}>
            {contactNumber && (
              <div className={contactRowStyle}>
                <Phone className={contactIconStyle} />
                <a href={`tel:${contactNumber}`}>{contactNumber}</a>
              </div>
            )}
            {contactEmail && (
              <div className={contactRowStyle}>
                <Mail className={contactIconStyle} />
                <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
              </div>
            )}
            {address && (
              <div className={contactRowStyle}>
                <MapPin className={contactIconStyle} />
                <span>{address}</span>
              </div>
            )}
            {!contactNumber && !contactEmail && !address && (
              <p className={css({ fontSize: "sm", color: "fg.muted" })}>
                Contact details haven&apos;t been added yet.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
