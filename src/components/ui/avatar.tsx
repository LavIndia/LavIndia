"use client";

import * as React from "react";
import { css, cx } from "styled-system/css";

type ImageLoadStatus = "idle" | "loaded" | "error";

interface AvatarContextValue {
  status: ImageLoadStatus;
  setStatus: (status: ImageLoadStatus) => void;
}

const AvatarContext = React.createContext<AvatarContextValue | null>(null);

function useAvatarContext() {
  const ctx = React.useContext(AvatarContext);
  if (!ctx) throw new Error("Avatar sub-components must be used within <Avatar>");
  return ctx;
}

const avatarRootStyle = css({
  position: "relative",
  display: "flex",
  height: "10",
  width: "10",
  flexShrink: 0,
  overflow: "hidden",
  borderRadius: "full",
});

const Avatar = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => {
    const [status, setStatus] = React.useState<ImageLoadStatus>("idle");
    return (
      <AvatarContext.Provider value={{ status, setStatus }}>
        <div
          ref={ref}
          data-slot="avatar"
          className={cx(avatarRootStyle, className)}
          {...props}
        />
      </AvatarContext.Provider>
    );
  }
);
Avatar.displayName = "Avatar";

const avatarImageStyle = css({
  aspectRatio: "1 / 1",
  height: "full",
  width: "full",
  objectFit: "cover",
});

/** Load state is owned by the avatar itself, so the handlers are not passed in. */
export type AvatarImageProps = Omit<React.ComponentProps<"img">, "onError" | "onLoad">;

const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className, src, ...props }, ref) => {
    const { status, setStatus } = useAvatarContext();

    // Reset load status whenever the image source changes, so switching avatars
    // shows the fallback again until the new image finishes loading.
    React.useEffect(() => {
      setStatus("idle");
    }, [src, setStatus]);

    if (status === "error" || !src) return null;

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        ref={ref}
        data-slot="avatar-image"
        src={src}
        className={cx(avatarImageStyle, className)}
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
        {...props}
      />
    );
  }
);
AvatarImage.displayName = "AvatarImage";

const avatarFallbackStyle = css({
  display: "flex",
  height: "full",
  width: "full",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "full",
  background: "bg.surface",
  color: "fg.muted",
  fontFamily: "body",
  fontSize: "sm",
  fontWeight: "medium",
});

const AvatarFallback = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => {
    const { status } = useAvatarContext();
    if (status === "loaded") return null;
    return (
      <div
        ref={ref}
        data-slot="avatar-fallback"
        className={cx(avatarFallbackStyle, className)}
        {...props}
      />
    );
  }
);
AvatarFallback.displayName = "AvatarFallback";

export { Avatar, AvatarImage, AvatarFallback };
