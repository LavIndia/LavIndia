import * as React from "react";

export interface AspectRatioProps extends React.ComponentProps<"div"> {
  /** width / height, e.g. 16 / 9. Defaults to 1 (square). */
  ratio?: number;
}

function AspectRatio({ ratio = 1, className, style, ...props }: AspectRatioProps) {
  return (
    <div
      data-slot="aspect-ratio"
      className={className}
      style={{ aspectRatio: ratio, ...style }}
      {...props}
    />
  );
}

export { AspectRatio };
