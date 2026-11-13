"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { safeLocalPath } from "@/lib/safe-redirect";
import { useAuthDialog } from "./AuthDialogProvider";

/**
 * Opens the login dialog when the site sent a visitor here to sign in.
 *
 * A signed-out visitor who opens a members-only page such as /checkout is
 * redirected to the home page with `?callbackUrl=/checkout` (see
 * middleware.ts). On its own that leaves them on the home page with no sign
 * of what to do. This asks them to sign in straight away, and after they do
 * takes them on to the page they were trying to reach.
 */
export function LoginFromRedirect() {
  const { requireAuth } = useAuthDialog();
  const { status } = useSession();
  const router = useRouter();
  const callbackUrl = useSearchParams().get("callbackUrl");
  const prompted = useRef(false);

  useEffect(() => {
    const target = safeLocalPath(callbackUrl);
    if (!target || prompted.current || status !== "unauthenticated") return;
    prompted.current = true;
    requireAuth(() => router.push(target), { returnTo: target });
  }, [callbackUrl, status, requireAuth, router]);

  return null;
}
