"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu } from "./menu";
import { Navigation } from "./Navigation";
import { SearchIcon } from "./searchicon";
import { designSystem } from "@/styles/design-system";
import CartSheet from "@/components/cart/CartSheet";
import { UserMenu } from "@/components/auth/UserMenu";
import { AdminModeToggle } from "./AdminModeToggle";
import { useSiteSettings } from "@/components/providers/SiteSettingsProvider";

export function HeaderSection() {
  const { businessName } = useSiteSettings();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white shadow-sm">
      <div className="container mx-auto flex h-25 items-center justify-between px-4">
        {/* Left side - Menu */}
        <div className="flex items-center">
          <Menu />
        </div>

        {/* Center - Logo */}
        <div className="flex-1 flex justify-center">
          <Link href="/">
            <Image
              src="/name_logo.svg"
              alt={`${businessName} Logo`}
              width={240}
              height={40}
              className="h-auto w-auto"
            />
          </Link>
        </div>

        {/* Right side - Navigation, Search and Utility Links */}
        <div className={`flex items-center ${designSystem.spacing.md}`}>
          <div className="hidden md:flex">
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
