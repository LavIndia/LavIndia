"use client";

import * as React from "react";
import {
  Slider as AriaSlider,
  SliderTrack,
  SliderFill,
  SliderThumb,
  type SliderProps as AriaSliderProps,
} from "react-aria-components";
import { css, cx } from "styled-system/css";

const rootStyle = css({
  display: "flex",
  width: "full",
  touchAction: "none",
  userSelect: "none",
  "&[data-disabled]": { opacity: 0.5, cursor: "not-allowed" },
});

const trackStyle = css({
  position: "relative",
  display: "flex",
  alignItems: "center",
  width: "full",
  height: "5",
  cursor: "pointer",
  "&[data-disabled]": { cursor: "not-allowed" },
});

const railStyle = css({
  position: "absolute",
  insetInline: "0",
  top: "50%",
  transform: "translateY(-50%)",
  height: "1.5",
  borderRadius: "full",
  background: "border.subtle",
});

const fillStyle = css({
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  height: "1.5",
  borderRadius: "full",
  background: "linear-gradient(135deg, {colors.gold.300}, {colors.gold.500})",
});

const thumbStyle = css({
  width: "4",
  height: "4",
  borderRadius: "full",
  background: "bg.surface",
  border: "2px solid",
  borderColor: "accent.default",
  boxShadow: "card",
  transition: "box-shadow 0.15s ease, transform 0.12s ease",
  "&[data-dragging]": { transform: "scale(1.15)" },
  "&[data-focus-visible]": { boxShadow: "0 0 0 3px token(colors.gold.200)" },
  "&[data-disabled]": { cursor: "not-allowed" },
});

export interface SliderProps
  extends Omit<AriaSliderProps<number[]>, "className" | "children"> {
  className?: string;
  /** Back-compat alias for minValue (old Radix API used the native-input name `min`). */
  min?: number;
  /** Back-compat alias for maxValue. */
  max?: number;
  /** Back-compat alias for isDisabled. */
  disabled?: boolean;
  /** Back-compat alias for onChange. */
  onValueChange?: (value: number[]) => void;
  /** Back-compat alias for onChangeEnd. */
  onValueCommit?: (value: number[]) => void;
}

export function Slider({
  className,
  min = 0,
  max = 100,
  minValue,
  maxValue,
  disabled,
  isDisabled,
  value,
  defaultValue,
  onValueChange,
  onValueCommit,
  onChange,
  onChangeEnd,
  ...props
}: SliderProps) {
  const thumbCount = React.useMemo(() => {
    const source = value ?? defaultValue;
    return Array.isArray(source) ? source.length : 2;
  }, [value, defaultValue]);

  const resolvedDefaultValue = React.useMemo(
    () => defaultValue ?? (value ? undefined : [minValue ?? min, maxValue ?? max]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <AriaSlider
      className={cx(rootStyle, className)}
      minValue={minValue ?? min}
      maxValue={maxValue ?? max}
      isDisabled={isDisabled ?? disabled}
      value={value}
      defaultValue={resolvedDefaultValue}
      onChange={(v) => {
        const next = v as number[];
        onChange?.(next);
        onValueChange?.(next);
      }}
      onChangeEnd={(v) => {
        const next = v as number[];
        onChangeEnd?.(next);
        onValueCommit?.(next);
      }}
      {...props}
    >
      <SliderTrack className={trackStyle}>
        <span className={railStyle} />
        <SliderFill className={fillStyle} />
        {Array.from({ length: thumbCount }, (_, index) => (
          <SliderThumb key={index} index={index} className={thumbStyle} />
        ))}
      </SliderTrack>
    </AriaSlider>
  );
}
