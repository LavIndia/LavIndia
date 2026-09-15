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
import { Bell, LogOut, User, ShoppingBag } from "lucide-react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";

interface AdminTopbarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: string;
  };
}

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
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-4 pl-20 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="hidden h-5 w-px bg-border sm:block" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {sectionTitle}
          </p>
          <p className="hidden text-xs text-muted-foreground sm:block">
            Store administration
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Customer View Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/")}
          className="flex items-center gap-2"
        >
          <ShoppingBag className="h-4 w-4" />
          <span className="hidden sm:inline">Customer View</span>
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 gap-2 pl-2 pr-3">
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src={user.image || undefined}
                  alt={user.name || "Admin"}
                />
                <AvatarFallback className="bg-purple-100 text-purple-600">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col items-start text-left text-sm sm:flex">
                <span className="font-medium">{user.name || "Admin"}</span>
                <span className="text-xs text-muted-foreground">
                  {user.role}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{user.name || "Admin"}</p>
                <p className="text-xs text-gray-500">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
