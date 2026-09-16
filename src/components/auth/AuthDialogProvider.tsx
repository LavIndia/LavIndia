"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import { AuthDialog } from "./AuthDialog";

type AuthDialogContextValue = {
  /**
   * If the shopper is already signed in, runs `onAuthenticated` immediately
   * and returns true. Otherwise opens the login/signup dialog and returns
   * false; if the shopper completes sign-in, `onAuthenticated` runs right
   * after (e.g. so an "Add to Cart" click that was blocked by a login wall
   * completes automatically once they're signed in).
   */
  requireAuth: (onAuthenticated?: () => void) => boolean;
};

const AuthDialogContext = createContext<AuthDialogContextValue | null>(null);

export function AuthDialogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const requireAuth = useCallback(
    (onAuthenticated?: () => void) => {
      if (status === "authenticated") {
        onAuthenticated?.();
        return true;
      }
      pendingActionRef.current = onAuthenticated ?? null;
      setIsOpen(true);
      return false;
    },
    [status]
  );

  const handleAuthSuccess = useCallback(() => {
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    action?.();
  }, []);

  const handleClose = useCallback(() => {
    pendingActionRef.current = null;
    setIsOpen(false);
  }, []);

  return (
    <AuthDialogContext.Provider value={{ requireAuth }}>
      {children}
      <AuthDialog
        isOpen={isOpen}
        onClose={handleClose}
        onAuthSuccess={handleAuthSuccess}
      />
    </AuthDialogContext.Provider>
  );
}

export function useAuthDialog() {
  const ctx = useContext(AuthDialogContext);
  if (!ctx) {
    throw new Error("useAuthDialog must be used within AuthDialogProvider");
  }
  return ctx;
}
