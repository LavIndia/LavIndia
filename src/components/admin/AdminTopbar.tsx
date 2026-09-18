"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, LogOut, User, ShoppingBag, Plus, Search } from "lucide-react";
import { signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { css } from "styled-system/css";

interface AdminTopbarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: string;
  };
}

const headerStyle = css({
  display: "flex",
  height: "16",
  flexShrink: "0",
  alignItems: "center",
  justifyContent: "space-between",
  borderBottom: "1px solid",
  borderColor: "border.subtle",
  background: "bg.glassStrong",
  backdropBlur: "glass",
  paddingInline: { base: "4", md: "6" },
  paddingLeft: { base: "20", md: "6" },
});

const titleWrapStyle = css({ display: "flex", minWidth: "0", alignItems: "center", gap: "3" });
const titleStyle = css({ fontFamily: "display", fontSize: "md", fontWeight: "semibold", color: "fg.default", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" });
const subtitleStyle = css({ display: { base: "none", sm: "block" }, fontSize: "xs", color: "fg.muted" });
const actionsStyle = css({ display: "flex", alignItems: "center", gap: { base: "1", sm: "2" } });
const searchHintStyle = css({ display: { base: "none", lg: "inline" }, fontSize: "xs", color: "fg.muted" });
const avatarButtonStyle = css({ height: "10", paddingInline: "2", display: "flex", alignItems: "center", gap: "2" });
const nameColStyle = css({ display: { base: "none", sm: "flex" }, flexDirection: "column", alignItems: "flex-start", textAlign: "left", fontSize: "sm" });
const roleTextStyle = css({ fontSize: "xs", color: "fg.muted" });

export function AdminTopbar({ user }: AdminTopbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const section = pathname.split("/")[2] || "dashboard";
  const sectionTitle = section
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  const initials =
    user.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "A";

  return (
    <header className={headerStyle}>
      <div className={titleWrapStyle}>
        <div>
          <p className={titleStyle}>{sectionTitle}</p>
          <p className={subtitleStyle}>Store administration</p>
        </div>
      </div>

      <div className={actionsStyle}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            window.dispatchEvent(new Event("admin:open-command-palette"))
          }
          className={css({ gap: "2" })}
        >
          <Search className={css({ height: "4", width: "4" })} />
          <span className={searchHintStyle}>Search… ⌘K</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="default" size="sm" className={css({ gap: "1.5" })}>
              <Plus className={css({ height: "4", width: "4" })} />
              <span className={css({ display: { base: "none", sm: "inline" } })}>New</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push("/admin/products/new")}>
              New Product
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/admin/discounts/new")}>
              New Discount
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/admin/hero-banners/new")}>
              New Hero Banner
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/")}
          className={css({ gap: "2", display: { base: "none", md: "inline-flex" } })}
        >
          <ShoppingBag className={css({ height: "4", width: "4" })} />
          Customer View
        </Button>

        <Button variant="ghost" size="icon" className={css({ position: "relative" })}>
          <Bell className={css({ height: "4", width: "4" })} />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className={avatarButtonStyle}>
              <Avatar className={css({ height: "8", width: "8" })}>
                <AvatarImage src={user.image || undefined} alt={user.name || "Admin"} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className={nameColStyle}>
                <span className={css({ fontWeight: "medium" })}>{user.name || "Admin"}</span>
                <span className={roleTextStyle}>{user.role}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className={css({ width: "14rem" })} align="end">
            <DropdownMenuLabel>
              <div className={css({ display: "flex", flexDirection: "column", gap: "0.5" })}>
                <p className={css({ fontSize: "sm", fontWeight: "medium" })}>{user.name || "Admin"}</p>
                <p className={css({ fontSize: "xs", color: "fg.muted" })}>{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              <User className={css({ marginRight: "2", height: "4", width: "4" })} />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={async () => {
                await signOut({ redirect: false });
                window.location.assign("/");
              }}
            >
              <LogOut className={css({ marginRight: "2", height: "4", width: "4" })} />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
