import * as React from "react";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { css, cx } from "styled-system/css";

function Breadcrumb({ ...props }: React.ComponentProps<"nav">) {
  return <nav aria-label="breadcrumb" data-slot="breadcrumb" {...props} />;
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cx(
        css({
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "1.5",
          fontFamily: "body",
          fontSize: "sm",
          color: "fg.muted",
          wordBreak: "break-word",
          listStyle: "none",
          padding: "0",
          margin: "0",
        }),
        className
      )}
      {...props}
    />
  );
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cx(css({ display: "inline-flex", alignItems: "center", gap: "1.5" }), className)}
      {...props}
    />
  );
}

export interface BreadcrumbLinkProps extends React.ComponentProps<"a"> {
  /** Render styling onto the single child element instead of an <a> (e.g. wrapping a Next.js <Link>). */
  asChild?: boolean;
}

function BreadcrumbLink({ asChild, className, children, ...props }: BreadcrumbLinkProps) {
  const classes = cx(
    css({
      color: "fg.muted",
      transition: "color 0.15s ease",
      "&:hover, &[data-hovered]": { color: "fg.default" },
    }),
    className
  );

  if (asChild) {
    const child = React.Children.only(children) as React.ReactElement<{ className?: string }>;
    return React.cloneElement(child, {
      className: cx(classes, child.props.className),
    });
  }

  return (
    <a data-slot="breadcrumb-link" className={classes} {...props}>
      {children}
    </a>
  );
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cx(css({ color: "fg.default", fontWeight: "normal" }), className)}
      {...props}
    />
  );
}

function BreadcrumbSeparator({ children, className, ...props }: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={cx(css({ "& svg": { width: "3.5", height: "3.5" } }), className)}
      {...props}
    >
      {children ?? <ChevronRight />}
    </li>
  );
}

function BreadcrumbEllipsis({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      aria-hidden="true"
      className={cx(
        css({ display: "flex", height: "9", width: "9", alignItems: "center", justifyContent: "center" }),
        className
      )}
      {...props}
    >
      <MoreHorizontal className={css({ width: "4", height: "4" })} />
      <span
        className={css({
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: "0",
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: "0",
        })}
      >
        More
      </span>
    </span>
  );
}

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
};
