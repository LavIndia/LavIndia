import { Loader2 } from "lucide-react";
import { css } from "styled-system/css";

/**
 * The holding state for the profile page.
 *
 * Used both while the session and profile data are loading and as the
 * Suspense fallback around the page itself, so the two are guaranteed to look
 * the same rather than drifting apart.
 */
export function ProfileFallback() {
  return (
    <div
      className={css({
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
      })}
    >
      <Loader2 className={css({ h: "8", w: "8", animation: "spin", color: "accent.default" })} />
    </div>
  );
}
