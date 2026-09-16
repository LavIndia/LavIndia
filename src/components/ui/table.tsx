import * as React from "react";
import { css, cx } from "styled-system/css";

/**
 * Plain semantic HTML table styled with Panda — every current call site (admin
 * lists) renders static rows only, no sorting/selection, so React Aria's
 * interactive Table is unnecessary here (golden rule 2).
 */

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className={css({ position: "relative", width: "100%", overflowX: "auto" })}>
      <table
        data-slot="table"
        className={cx(css({ width: "100%", fontSize: "sm", captionSide: "bottom", borderCollapse: "collapse" }), className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cx(css({ "& tr": { borderBottom: "1px solid", borderColor: "border.subtle" } }), className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cx(css({ "& tr:last-child": { borderBottom: "0" } }), className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cx(
        css({
          background: "bg.surface",
          borderTop: "1px solid",
          borderColor: "border.subtle",
          fontWeight: "medium",
          "& > tr:last-child": { borderBottom: "0" },
        }),
        className
      )}
      {...props}
    />
  );
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cx(
        css({
          borderBottom: "1px solid",
          borderColor: "border.subtle",
          transition: "background-color 0.15s ease",
          "&:hover": { background: "bg.surface" },
          "&[data-state=selected]": { background: "bg.surface" },
        }),
        className
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cx(
        css({
          height: "10",
          paddingInline: "2",
          textAlign: "left",
          verticalAlign: "middle",
          fontFamily: "body",
          fontWeight: "medium",
          color: "fg.default",
          whiteSpace: "nowrap",
        }),
        className
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cx(
        css({
          padding: "2",
          verticalAlign: "middle",
          whiteSpace: "nowrap",
        }),
        className
      )}
      {...props}
    />
  );
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cx(css({ marginTop: "4", fontSize: "sm", color: "fg.muted" }), className)}
      {...props}
    />
  );
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
