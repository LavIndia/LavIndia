"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  Suspense,
} from "react";
import { useSession } from "next-auth/react";
import { AuthDialog } from "./AuthDialog";
import { LoginFromRedirect } from "./LoginFromRedirect";

type AuthDialogContextValue = {
  /**
   * If the shopper is already signed in, runs `onAuthenticated` immediately
   * and returns true. Otherwise opens the login/signup dialog and returns
   * false; if the shopper completes sign-in, `onAuthenticated` runs right
   * after (e.g. so an "Add to Cart" click that was blocked by a login wall
   * completes automatically once they're signed in).
   *
   * `returnTo` is where Google sign-in brings them back to. Google leaves the
   * site and returns by a full page load, which loses `onAuthenticated`, so
   * the destination has to travel with the request.
   */
  requireAuth: (onAuthenticated?: () => void, options?: { returnTo?: string }) => boolean;
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
  const [returnTo, setReturnTo] = useState("/");

  const requireAuth = useCallback(
    (onAuthenticated?: () => void, options?: { returnTo?: string }) => {
      if (status === "authenticated") {
        onAuthenticated?.();
        return true;
      }
      pendingActionRef.current = onAuthenticated ?? null;
      setReturnTo(options?.returnTo ?? "/");
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
      {/* Reads the address bar, so it needs a Suspense boundary to keep the
          pages around it statically renderable. */}
      <Suspense fallback={null}>
        <LoginFromRedirect />
      </Suspense>
      <AuthDialog
        returnTo={returnTo}
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
