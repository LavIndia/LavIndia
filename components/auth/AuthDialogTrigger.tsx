"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { AuthDialog } from "./AuthDialog";

export function AuthDialogTrigger() {
  const { status } = useSession();
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    // Show dialog on first visit if not logged in
    if (status === "unauthenticated") {
      const hasSeenDialog = sessionStorage.getItem("hasSeenAuthDialog");
      if (!hasSeenDialog) {
        // Show dialog after a short delay for better UX
        const timer = setTimeout(() => {
          setShowDialog(true);
          sessionStorage.setItem("hasSeenAuthDialog", "true");
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [status]);

  return (
    <AuthDialog isOpen={showDialog} onClose={() => setShowDialog(false)} />
  );
}
