"use client";

import { useState } from "react";
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
import { AuthDialog } from "@/components/auth/AuthDialog";

export function UserMenu() {
  const { data: session, status } = useSession();
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    window.location.assign("/");
  };

  // Show loading state
  if (status === "loading") {
    return (
      <Button variant="ghost" size="icon" className="relative" disabled>
        <User className="h-5 w-5 text-gray-600" />
      </Button>
    );
  }

  // User is not logged in
  if (!session?.user) {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          className="relative hover:bg-gray-100"
          onClick={() => setShowAuthDialog(true)}
        >
          <User className="h-5 w-5 text-gray-600" />
          <span className="sr-only">Login</span>
        </Button>
        <AuthDialog
          isOpen={showAuthDialog}
          onClose={() => setShowAuthDialog(false)}
        />
      </>
    );
  }

  // User is logged in
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="relative h-10 w-10 rounded-full p-0 hover:bg-gray-100"
          >
            <Avatar className="h-9 w-9">
              <AvatarImage
                src={session.user.image || undefined}
                alt={session.user.name || "User"}
              />
              <AvatarFallback className="bg-gradient-to-br from-amber-400 to-orange-500 text-white font-medium">
                {session.user.name?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <span className="sr-only">User menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {session.user.name || "User"}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {session.user.email || session.user.mobile || ""}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/profile" className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/orders" className="cursor-pointer">
              <Package className="mr-2 h-4 w-4" />
              <span>Orders</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/addresses" className="cursor-pointer">
              <MapPin className="mr-2 h-4 w-4" />
              <span>Addresses</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/wishlist" className="cursor-pointer">
              <Heart className="mr-2 h-4 w-4" />
              <span>Wishlist</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleSignOut}
            className="cursor-pointer text-red-600"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Logout</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AuthDialog
        isOpen={showAuthDialog}
        onClose={() => setShowAuthDialog(false)}
      />
    </>
  );
}
