"use client";

import { usePathname } from "next/navigation";
import { AuthDialogTrigger } from "./AuthDialogTrigger";

export function AuthDialogGate() {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) {
    return null;
  }

  return <AuthDialogTrigger />;
}
