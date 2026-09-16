import { css, cx } from "styled-system/css";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cx(
        css({
          background: "bg.glass",
          borderRadius: "md",
          animation: "pulse",
        }),
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
