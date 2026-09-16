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
import { css, cva, cx } from "styled-system/css";

// React Aria's Modal/ModalOverlay expose [data-entering]/[data-exiting] and
// defer unmounting until getAnimations() on their own DOM node settles — a
// plain CSS transition keyed on those attributes is picked up automatically,
// no animation library or manual isOpen-from-context plumbing needed.
const overlayStyle = css({
  position: "fixed",
  inset: 0,
  zIndex: "50",
  background: "rgba(18, 17, 16, 0.45)",
  transition: "opacity 0.22s ease-out",
  "&[data-entering], &[data-exiting]": { opacity: 0 },
});

type SheetSide = "top" | "right" | "bottom" | "left";

const sheetPanelStyle = cva({
  base: {
    position: "fixed",
    zIndex: "50",
    display: "flex",
    flexDirection: "column",
    borderRadius: "xl",
    border: "1px solid",
    borderColor: "border.glass",
    background: "bg.glassStrong",
    backdropBlur: "glass",
    boxShadow: "glassLg",
    outline: "none",
    overflow: "hidden",
    transition: "opacity 0.28s cubic-bezier(0.22,1,0.36,1), transform 0.28s cubic-bezier(0.22,1,0.36,1)",
    "&[data-entering], &[data-exiting]": { opacity: 0 },
  },
  variants: {
    side: {
      right: {
        top: "4",
        right: "4",
        bottom: "4",
        width: "91.6667%",
        maxWidth: "26rem",
        "&[data-entering], &[data-exiting]": { transform: "translateX(48px)" },
      },
      left: {
        top: "4",
        left: "4",
        bottom: "4",
        width: "91.6667%",
        maxWidth: "26rem",
        "&[data-entering], &[data-exiting]": { transform: "translateX(-48px)" },
      },
      top: {
        top: "4",
        left: "4",
        right: "4",
        maxHeight: "85vh",
        "&[data-entering], &[data-exiting]": { transform: "translateY(-48px)" },
      },
      bottom: {
        bottom: "4",
        left: "4",
        right: "4",
        maxHeight: "85vh",
        "&[data-entering], &[data-exiting]": { transform: "translateY(48px)" },
      },
    },
  },
  defaultVariants: { side: "right" },
});

const sheetSectionStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "4",
  padding: "6",
  height: "full",
  overflowY: "auto",
  color: "fg.default",
  outline: "none",
  position: "relative",
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

/** Back-compat: old Radix API used `open`/`onOpenChange`; bridged onto React Aria's DialogTrigger (same underlying overlay-trigger primitive as Dialog). */
export interface SheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  children?: React.ReactNode;
}

export function Sheet({ open, onOpenChange, defaultOpen, children }: SheetProps) {
  return (
    <AriaDialogTrigger isOpen={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {children}
    </AriaDialogTrigger>
  );
}

export interface SheetTriggerProps {
  asChild?: boolean;
  children?: React.ReactNode;
}

export function SheetTrigger({ asChild, children }: SheetTriggerProps) {
  if (asChild) {
    return React.Children.only(children) as React.ReactElement;
  }
  return <AriaButton>{children}</AriaButton>;
}

export interface SheetCloseProps {
  asChild?: boolean;
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
}

export function SheetClose({ asChild, className, children, onClick }: SheetCloseProps) {
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

export interface SheetContentProps extends Omit<AriaDialogProps, "className" | "children"> {
  className?: string;
  children?: React.ReactNode;
  side?: SheetSide;
  showCloseButton?: boolean;
}

export function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: SheetContentProps) {
  const state = React.useContext(OverlayTriggerStateContext);

  return (
    <AriaModalOverlay isDismissable className={overlayStyle}>
      <AriaModal className={cx(sheetPanelStyle({ side }), className)}>
        <AriaDialog className={sheetSectionStyle} {...props}>
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

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        css({ display: "flex", flexDirection: "column", gap: "1.5", textAlign: { base: "center", md: "left" }, paddingRight: "8" }),
        className
      )}
      {...props}
    />
  );
}

export function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        css({
          display: "flex",
          flexDirection: { base: "column-reverse", md: "row" },
          gap: "2",
          justifyContent: { md: "flex-end" },
          marginTop: "auto",
        }),
        className
      )}
      {...props}
    />
  );
}

export function SheetTitle({ className, ...props }: React.ComponentProps<typeof AriaHeading>) {
  return (
    <AriaHeading
      slot="title"
      className={cx(
        css({ fontFamily: "display", fontSize: "lg", fontWeight: "semibold", color: "fg.default" }),
        className
      )}
      {...props}
    />
  );
}

export function SheetDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cx(css({ fontSize: "sm", color: "fg.muted" }), className)} {...props} />;
}
