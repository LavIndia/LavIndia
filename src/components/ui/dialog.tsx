"use client";

import * as React from "react";
import {
  DialogTrigger as AriaDialogTrigger,
  Modal as AriaModal,
  ModalOverlay as AriaModalOverlay,
  Dialog as AriaDialog,
  Heading as AriaHeading,
  Button as AriaButton,
  OverlayTriggerStateContext,
  type DialogProps as AriaDialogProps,
} from "react-aria-components";
import { XIcon } from "lucide-react";
import { css, cx } from "styled-system/css";

// React Aria's Modal/ModalOverlay expose [data-entering]/[data-exiting] and
// defer unmounting until getAnimations() on their own DOM node settles — a
// plain CSS transition keyed on those attributes is picked up automatically,
// no animation library or manual isOpen-from-context plumbing needed. Base
// styles are the resting "open" state; [data-entering]/[data-exiting] both
// represent the hidden state the transition plays to/from.
const overlayStyle = css({
  position: "fixed",
  inset: 0,
  zIndex: "50",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "4",
  background: "rgba(18, 17, 16, 0.45)",
  transition: "opacity 0.18s ease-out",
  "&[data-entering], &[data-exiting]": { opacity: 0 },
});

const modalStyle = css({
  width: "full",
  maxWidth: "32rem",
  maxHeight: "90vh",
  overflowY: "auto",
  borderRadius: "xl",
  border: "1px solid",
  borderColor: "border.glass",
  background: "bg.glassStrong",
  backdropBlur: "glass",
  boxShadow: "glassLg",
  outline: "none",
  position: "relative",
  transition: "opacity 0.18s ease-out, transform 0.18s ease-out",
  "&[data-entering], &[data-exiting]": { opacity: 0, transform: "scale(0.96) translateY(8px)" },
});

const dialogSectionStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "4",
  padding: "6",
  color: "fg.default",
  outline: "none",
});

const closeButtonStyle = css({
  position: "absolute",
  top: "4",
  right: "4",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: "8",
  width: "8",
  borderRadius: "full",
  color: "fg.muted",
  background: "transparent",
  cursor: "pointer",
  outline: "none",
  transition: "background 0.15s ease, color 0.15s ease",
  "&[data-hovered]": { background: "bg.surface", color: "fg.default" },
  "&[data-focus-visible]": { boxShadow: "0 0 0 3px token(colors.gold.200)" },
  "& svg": { pointerEvents: "none" },
});

/** Back-compat alias: old Radix API used `open`/`onOpenChange`; React Aria's DialogTrigger uses `isOpen`/`onOpenChange` (same callback shape), so we just bridge `open` -> `isOpen`. */
export interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  children?: React.ReactNode;
}

export function Dialog({ open, onOpenChange, defaultOpen, children }: DialogProps) {
  return (
    <AriaDialogTrigger isOpen={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {children}
    </AriaDialogTrigger>
  );
}

export interface DialogTriggerProps {
  asChild?: boolean;
  children?: React.ReactNode;
}

export function DialogTrigger({ asChild, children }: DialogTriggerProps) {
  if (asChild) {
    return React.Children.only(children) as React.ReactElement;
  }
  return <AriaButton>{children}</AriaButton>;
}

export interface DialogCloseProps {
  asChild?: boolean;
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
}

export function DialogClose({ asChild, className, children, onClick }: DialogCloseProps) {
  const state = React.useContext(OverlayTriggerStateContext);
  const handlePress = () => {
    onClick?.();
    state?.close();
  };

  if (asChild) {
    const child = React.Children.only(children) as React.ReactElement<{
      className?: string;
      onClick?: (event: React.MouseEvent) => void;
    }>;
    return React.cloneElement(child, {
      className: cx(className, child.props.className),
      onClick: (event: React.MouseEvent) => {
        child.props.onClick?.(event);
        handlePress();
      },
    });
  }

  return (
    <AriaButton className={className} onPress={handlePress}>
      {children}
    </AriaButton>
  );
}

export interface DialogContentProps
  extends Omit<AriaDialogProps, "className" | "children"> {
  className?: string;
  children?: React.ReactNode;
  showCloseButton?: boolean;
}

export function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogContentProps) {
  const state = React.useContext(OverlayTriggerStateContext);

  return (
    <AriaModalOverlay isDismissable className={overlayStyle}>
      <AriaModal className={cx(modalStyle, className)}>
        <AriaDialog className={dialogSectionStyle} {...props}>
          {children}
          {showCloseButton && (
            <AriaButton className={closeButtonStyle} onPress={() => state?.close()} aria-label="Close">
              <XIcon size={16} aria-hidden />
            </AriaButton>
          )}
        </AriaDialog>
      </AriaModal>
    </AriaModalOverlay>
  );
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        css({ display: "flex", flexDirection: "column", gap: "1.5", textAlign: { base: "center", md: "left" } }),
        className
      )}
      {...props}
    />
  );
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        css({
          display: "flex",
          flexDirection: { base: "column-reverse", md: "row" },
          gap: "2",
          justifyContent: { md: "flex-end" },
        }),
        className
      )}
      {...props}
    />
  );
}

export function DialogTitle({ className, ...props }: React.ComponentProps<typeof AriaHeading>) {
  return (
    <AriaHeading
      slot="title"
      className={cx(
        css({ fontFamily: "display", fontSize: "lg", fontWeight: "semibold", lineHeight: "none", color: "fg.default" }),
        className
      )}
      {...props}
    />
  );
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cx(css({ fontSize: "sm", color: "fg.muted" }), className)} {...props} />;
}
