"use client";

import { useSession, signOut } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Package, MapPin, Heart, LogOut } from "lucide-react";
import Link from "next/link";
import { useAuthDialog } from "@/components/auth/AuthDialogProvider";
import { css } from "styled-system/css";

const triggerButtonStyle = css({
  position: "relative",
  height: "10",
  width: "10",
  borderRadius: "full",
  padding: "0",
});

const avatarStyle = css({ height: "9", width: "9" });

const fallbackStyle = css({
  background: "linear-gradient(135deg, {colors.gold.300}, {colors.gold.500})",
  color: "fg.onGold",
  fontWeight: "medium",
});

const menuIconStyle = css({ marginRight: "2", height: "4", width: "4" });

const menuLabelBlockStyle = css({ display: "flex", flexDirection: "column", gap: "1" });
const menuLabelNameStyle = css({ fontSize: "sm", fontWeight: "medium", lineHeight: "none" });
const menuLabelSubStyle = css({ fontSize: "xs", lineHeight: "none", color: "fg.muted" });

export function UserMenu() {
  const { data: session, status } = useSession();
  const { requireAuth } = useAuthDialog();

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    window.location.assign("/");
  };

  // Show loading state
  if (status === "loading") {
    return (
      <Button variant="ghost" size="icon" disabled>
        <User className={css({ height: "5", width: "5", color: "fg.muted" })} />
      </Button>
    );
  }

  // User is not logged in
  if (!session?.user) {
    return (
      <Button variant="ghost" size="icon" onClick={() => requireAuth()}>
        <User className={css({ height: "5", width: "5", color: "fg.muted" })} />
        <span className={css({ srOnly: true })}>Login</span>
      </Button>
    );
  }

  // User is logged in
  return (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className={triggerButtonStyle}>
            <Avatar className={avatarStyle}>
              <AvatarImage
                src={session.user.image || undefined}
                alt={session.user.name || "User"}
              />
              <AvatarFallback className={fallbackStyle}>
                {session.user.name?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <span className={css({ srOnly: true })}>User menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className={css({ width: "56" })}>
          <DropdownMenuLabel>
            <div className={menuLabelBlockStyle}>
              <p className={menuLabelNameStyle}>{session.user.name || "User"}</p>
              <p className={menuLabelSubStyle}>
                {session.user.email || session.user.mobile || ""}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/profile">
              <User className={menuIconStyle} />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/orders">
              <Package className={menuIconStyle} />
              <span>Orders</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/profile?tab=addresses">
              <MapPin className={menuIconStyle} />
              <span>Addresses</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/profile?tab=wishlist">
              <Heart className={menuIconStyle} />
              <span>Wishlist</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut} variant="destructive">
            <LogOut className={menuIconStyle} />
            <span>Logout</span>
          </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
