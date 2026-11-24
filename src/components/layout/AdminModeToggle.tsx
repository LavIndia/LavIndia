"use client";

import { useEffect, useTransition } from "react";
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

  const [isPending, startTransition] = useTransition();
  const target = isInAdminMode ? "/" : "/admin/dashboard";

  // Warm the destination so the click navigates immediately instead of
  // waiting on a cold route (the cause of "click did nothing").
  useEffect(() => {
    if (isAdmin) router.prefetch(target);
  }, [isAdmin, router, target]);

  if (!isAdmin) return null;

  const handleToggle = () => {
    // Ignore repeat taps while navigating; show pending state meanwhile.
    if (isPending) return;
    startTransition(() => router.push(target));
  };

  return (
    <Button
      onClick={handleToggle}
      disabled={isPending}
      aria-busy={isPending}
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
