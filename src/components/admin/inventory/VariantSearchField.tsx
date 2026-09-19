"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, Loader2, ScanLine } from "lucide-react";
import { css } from "styled-system/css";
import { formatPaisa } from "@/modules/_shared/money";
import { useVariantLookup, type LookupResult } from "./useVariantLookup";
import { CameraScanButton } from "@/components/scanning/CameraScanButton";
import type { ScanEvent } from "@/components/scanning/useBarcodeScanner";

const rowStyle = css({ display: "flex", alignItems: "center", gap: "2", width: "full" });
const wrapStyle = css({ position: "relative", flex: "1", minWidth: "0" });
const iconStyle = css({
  position: "absolute",
  left: "3",
  top: "50%",
  transform: "translateY(-50%)",
  height: "4",
  width: "4",
  color: "fg.muted",
  pointerEvents: "none",
});
const spinnerStyle = css({
  position: "absolute",
  left: "3",
  top: "50%",
  transform: "translateY(-50%)",
  height: "4",
  width: "4",
  color: "fg.muted",
  pointerEvents: "none",
  animation: "spin 1s linear infinite",
});

const inputStyle = css({ paddingLeft: "9" });

const listStyle = css({
  position: "absolute",
  zIndex: "30",
  marginTop: "1",
  width: "full",
  maxHeight: "20rem",
  overflowY: "auto",
  borderRadius: "md",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
  boxShadow: "lg",
});

const itemStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "3",
  width: "full",
  paddingInline: "3",
  paddingBlock: "2.5",
  textAlign: "left",
  cursor: "pointer",
  borderBottom: "1px solid",
  borderColor: "border.subtle",
  "&:last-child": { borderBottom: "none" },
  "&:hover": { background: "bg.canvas" },
});

const nameStyle = css({ fontSize: "sm", fontWeight: "medium", color: "fg.default" });
const metaStyle = css({ fontSize: "xs", color: "fg.muted" });
const stockStyle = (available: number) =>
  css({
    fontSize: "sm",
    fontWeight: "semibold",
    whiteSpace: "nowrap",
    color: available > 0 ? "fg.default" : "red.600",
  });

const emptyStyle = css({ padding: "3", fontSize: "sm", color: "fg.muted" });

/**
 * Find an item by scanning or typing.
 *
 * One field serves both: a hardware scanner types the barcode and sends
 * Enter, which triggers an exact lookup; a person typing a product name gets
 * a debounced search. Neither path can create a product — an unknown code
 * says so and leaves the operator to search manually.
 */
export function VariantSearchField({
  onSelect,
  locationId,
  placeholder = "Scan barcode, or search by name or SKU",
  autoFocus,
}: {
  onSelect: (variant: LookupResult) => void;
  locationId?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);

  /**
   * A hardware scanner is a keyboard that types impossibly fast. Tracking the
   * gap between keystrokes lets us tell a scan from a person typing, which
   * matters for two reasons: a scan should not fire the name-search request
   * on its way past, and a scanner configured without an Enter suffix still
   * needs its code looked up once the burst stops.
   */
  const lastKeyAtRef = useRef(0);
  const scanLikeRef = useRef(false);
  const HUMAN_KEYSTROKE_GAP_MS = 35;
  const { results, loading, notFoundCode, search, lookupByCode, reset } = useVariantLookup({
    locationId,
  });
  const containerRef = useRef<HTMLDivElement>(null);

  const onChange = useCallback((next: string) => {
    const now = Date.now();
    const gap = now - lastKeyAtRef.current;
    // A burst of characters with almost no gap is a scanner, not a person.
    if (next.length > value.length + 1 || (next.length > 1 && gap < HUMAN_KEYSTROKE_GAP_MS)) {
      scanLikeRef.current = true;
    } else if (gap > 400) {
      scanLikeRef.current = false;
    }
    lastKeyAtRef.current = now;
    setValue(next);
  }, [value.length]);

  useEffect(() => {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      reset();
      return;
    }

    // A scan resolves as an exact code once the burst stops — covering
    // scanners that send no Enter suffix — and never runs the name search,
    // which would be a wasted request for a code that will match exactly.
    if (scanLikeRef.current) {
      const timer = setTimeout(async () => {
        const found = await lookupByCode(trimmed);
        if (found.length === 1) {
          onSelect(found[0]);
          setValue("");
          reset();
          setOpen(false);
        } else {
          setOpen(true);
        }
        scanLikeRef.current = false;
      }, 120);
      return () => clearTimeout(timer);
    }

    // Typed input is debounced so a product name does not fire a request per
    // keystroke.
    const timer = setTimeout(() => {
      search(trimmed);
      setOpen(true);
    }, 250);
    return () => clearTimeout(timer);
  }, [value, search, reset, lookupByCode, onSelect]);

  useEffect(() => {
    const onClickAway = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  const choose = (variant: LookupResult) => {
    onSelect(variant);
    setValue("");
    reset();
    setOpen(false);
  };

  /**
   * A code read from the camera.
   *
   * Resolved the same way as a hardware scan, so a phone behaves exactly as
   * the counter does. When the code matches nothing the text is left in the
   * box rather than discarded — the operator can then correct it or search by
   * name instead of scanning again.
   */
  const onCameraScan = async (event: ScanEvent) => {
    const code = event.code.trim();
    if (!code) return;
    const found = await lookupByCode(code);
    if (found.length === 1) {
      choose(found[0]);
      return;
    }
    setValue(code);
    setOpen(true);
  };

  /**
   * Enter means "this is a complete code" — which is exactly what a hardware
   * scanner sends after the barcode. An exact hit is selected outright so a
   * scan never requires a second click.
   */
  const onKeyDown = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const code = value.trim();
    if (!code) return;

    const found = await lookupByCode(code);
    if (found.length === 1) choose(found[0]);
    else setOpen(true);
  };

  return (
    <div className={rowStyle} ref={containerRef}>
      <div className={wrapStyle}>
      {loading ? <Loader2 className={spinnerStyle} /> : <Search className={iconStyle} />}
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={inputStyle}
        aria-label="Scan or search for an item"
        /* This field recognises a scan by itself (both on Enter and when the
           burst simply stops), so the page-wide scanner capture must leave
           keystrokes landing here alone. Without this, a scan made while the
           box has focus — which is the normal case, since it is autofocused —
           is reported twice and the item is added to the sale twice. */
        data-scan-owner="true"
      />

      {open && (
        <div className={listStyle}>
          {notFoundCode && (
            <p className={emptyStyle}>
              <ScanLine
                className={css({ height: "4", width: "4", display: "inline", marginRight: "1.5" })}
              />
              Barcode not found. Try searching by product name or SKU.
            </p>
          )}

          {!notFoundCode && results.length === 0 && !loading && (
            <p className={emptyStyle}>No matching item</p>
          )}

          {results.map((variant) => (
            <button
              key={variant.variantId}
              type="button"
              className={itemStyle}
              onClick={() => choose(variant)}
            >
              <span>
                <span className={nameStyle}>
                  {variant.productName}
                  {/* The implicit variant of an option-less product adds
                      nothing to read, so its name is left off. */}
                  {!variant.isDefault && ` · ${variant.variantName}`}
                </span>
                <br />
                <span className={metaStyle}>
                  {[variant.sku, formatPaisa(variant.priceCents)].filter(Boolean).join(" · ")}
                </span>
              </span>
              <span className={stockStyle(variant.available)}>{variant.available} avail.</span>
            </button>
          ))}
        </div>
      )}
      </div>

      {/* A phone or tablet has no scanner to plug in, so the camera is the
          only instrument it has. */}
      <CameraScanButton onScan={onCameraScan} />
    </div>
  );
}
