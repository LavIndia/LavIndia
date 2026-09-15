"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Shield, ShoppingBag } from "lucide-react";

export function AdminModeToggle() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = session?.user?.role === "ADMIN";
  const isInAdminMode = pathname.startsWith("/admin");

  if (!isAdmin) return null;

  const handleToggle = () => {
    if (isInAdminMode) {
      // Switch to user mode - go to homepage
      router.push("/");
    } else {
      // Switch to admin mode - go to admin dashboard
      router.push("/admin/dashboard");
    }
  };

  return (
    <Button
      onClick={handleToggle}
      variant={isInAdminMode ? "default" : "outline"}
      size="sm"
      className="flex items-center gap-2"
    >
      {isInAdminMode ? (
        <>
          <ShoppingBag className="h-4 w-4" />
          <span className="hidden sm:inline">Customer View</span>
        </>
      ) : (
        <>
          <Shield className="h-4 w-4" />
          <span className="hidden sm:inline">Admin Panel</span>
        </>
      )}
    </Button>
  );
}
