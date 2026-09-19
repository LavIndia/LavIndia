"use client";

import { useEffect, useRef } from "react";

/**
 * Where a scanned code came from.
 *
 * Declared in full now so that adding the camera later changes only this
 * module — POS, Receive and Adjustments already branch on the source rather
 * than assuming a keyboard.
 */
export type ScanSource = "HARDWARE_SCANNER" | "CAMERA" | "MANUAL_ENTRY";

export interface ScanEvent {
  code: string;
  source: ScanSource;
}

/**
 * Captures a hardware barcode scanner anywhere on the page.
 *
 * Nearly every USB and Bluetooth scanner is a "keyboard wedge": it types the
 * barcode's characters into whatever has focus and usually sends Enter. That
 * makes a focused text input the obvious approach — and it is what the search
 * field does — but it fails the moment the operator has not clicked into the
 * field first, which at a counter is most of the time.
 *
 * So this listens at the document level and distinguishes a scan from typing
 * by SPEED: a scanner emits characters far faster than fingers can. A burst
 * of fast keystrokes terminated by Enter, or by a pause, is reported as a
 * scan; anything slower is ignored and left to the focused element.
 *
 * Deliberately conservative: when the operator is genuinely typing into a
 * field, their keystrokes are never stolen.
 */
export interface BarcodeScannerOptions {
  onScan: (event: ScanEvent) => void;
  /** Turn capture off, e.g. while a dialog owns the keyboard. */
  enabled?: boolean;
  /**
   * Maximum gap between characters for input to count as machine-typed.
   * 35ms is comfortably above a scanner's rate and far below a fast human's.
   */
  maxKeystrokeGapMs?: number;
  /** Shortest string worth treating as a barcode. */
  minLength?: number;
}

const DEFAULT_GAP_MS = 35;
const DEFAULT_MIN_LENGTH = 4;
/** How long after the last character to accept a scan that sent no Enter. */
const BURST_END_MS = 120;

/** Fields where a human is plausibly typing, so slow input must be left alone. */
function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

/**
 * Marks a field that resolves scans by itself.
 *
 * A keyboard-wedge scanner types into whatever has focus, so when the focused
 * field is scan-aware BOTH it and this hook would recognise the same burst and
 * each would report it — the item is added twice and the customer is charged
 * twice. Exactly one of them must own a given scan. When the keystrokes are
 * landing in a field that carries this attribute, that field is the owner and
 * this hook stays out of the way entirely.
 */
const SCAN_OWNER_ATTRIBUTE = "data-scan-owner";

function ownsItsOwnScans(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.closest(`[${SCAN_OWNER_ATTRIBUTE}]`) !== null;
}

export function useBarcodeScanner({
  onScan,
  enabled = true,
  maxKeystrokeGapMs = DEFAULT_GAP_MS,
  minLength = DEFAULT_MIN_LENGTH,
}: BarcodeScannerOptions): void {
  // Held in refs so the document listener is attached once and never
  // re-subscribed on each render.
  const bufferRef = useRef("");
  const lastKeyAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!enabled) return;

    const clearTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };

    const flush = () => {
      const code = bufferRef.current.trim();
      bufferRef.current = "";
      clearTimer();
      if (code.length >= minLength) {
        onScanRef.current({ code, source: "HARDWARE_SCANNER" });
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      // A scanner sends no modifiers; a shortcut is never a scan.
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      // The focused field resolves its own scans, so this hook must not also
      // report them. Its buffer is dropped too, so characters typed there can
      // never join a later burst captured elsewhere on the page.
      if (ownsItsOwnScans(event.target)) {
        bufferRef.current = "";
        clearTimer();
        return;
      }

      const now = Date.now();
      const gap = now - lastKeyAtRef.current;
      lastKeyAtRef.current = now;

      if (event.key === "Enter") {
        // Enter only ends a scan if a fast burst preceded it — otherwise it
        // is the operator submitting a form, which must not be swallowed.
        if (bufferRef.current.length >= minLength && gap < maxKeystrokeGapMs * 4) {
          const wasScan = bufferRef.current.length >= minLength;
          if (wasScan && !isTextEntry(event.target)) event.preventDefault();
          flush();
        } else {
          bufferRef.current = "";
        }
        return;
      }

      // Only printable single characters form a barcode.
      if (event.key.length !== 1) return;

      // A gap long enough to be human resets the buffer. Inside a text field
      // this is what keeps ordinary typing from ever being read as a scan.
      if (gap > maxKeystrokeGapMs) {
        bufferRef.current = event.key;
      } else {
        bufferRef.current += event.key;
      }

      // Covers scanners configured without an Enter suffix: once the burst
      // stops, whatever was collected is treated as the code.
      clearTimer();
      timerRef.current = setTimeout(() => {
        if (bufferRef.current.length >= minLength) flush();
        else bufferRef.current = "";
      }, BURST_END_MS);
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      clearTimer();
    };
  }, [enabled, maxKeystrokeGapMs, minLength]);
}
