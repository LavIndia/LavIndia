"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Shield, ShoppingBag } from "lucide-react";
import { css } from "styled-system/css";

const toggleStyle = css({ display: "flex", alignItems: "center", gap: "2" });
const labelStyle = css({ display: { base: "none", sm: "inline" } });

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
      className={toggleStyle}
    >
      {isInAdminMode ? (
        <>
          <ShoppingBag className={css({ height: "4", width: "4" })} />
          <span className={labelStyle}>Customer View</span>
        </>
      ) : (
        <>
          <Shield className={css({ height: "4", width: "4" })} />
          <span className={labelStyle}>Admin Panel</span>
        </>
      )}
    </Button>
  );
}
