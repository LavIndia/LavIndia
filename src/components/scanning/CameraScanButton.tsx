"use client";

import { useState } from "react";
import { Camera, X } from "lucide-react";
import { css } from "styled-system/css";
import { useCameraScanner } from "./useCameraScanner";
import type { ScanEvent } from "./useBarcodeScanner";

const triggerStyle = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  // 44px: the smallest target that is reliably hit with a thumb, which is
  // the only way this button is ever pressed.
  height: "11",
  width: "11",
  borderRadius: "md",
  border: "1px solid",
  borderColor: "border.subtle",
  background: "bg.surface",
  color: "fg.muted",
  cursor: "pointer",
  transition: "border-color 0.15s ease, color 0.15s ease",
  _hover: { borderColor: "accent.default", color: "accent.pressed" },
  "&:focus-visible": { outline: "none", boxShadow: "0 0 0 3px token(colors.gold.200)" },
});

const overlayStyle = css({
  position: "fixed",
  inset: 0,
  zIndex: "60",
  display: "flex",
  flexDirection: "column",
  background: "rgba(18, 17, 16, 0.92)",
});
const headerStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "3",
  padding: "4",
  paddingTop: "[max(1rem, env(safe-area-inset-top))]",
  color: "white",
});
const headingStyle = css({ fontSize: "sm", fontWeight: "medium" });
const closeStyle = css({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: "11",
  width: "11",
  borderRadius: "full",
  background: "rgba(255,255,255,0.12)",
  color: "white",
  cursor: "pointer",
  "&:focus-visible": { outline: "none", boxShadow: "0 0 0 3px rgba(255,255,255,0.4)" },
});
const stageStyle = css({
  position: "relative",
  flex: "1",
  minHeight: 0,
  overflow: "hidden",
});
const videoStyle = css({
  width: "full",
  height: "full",
  objectFit: "cover",
});
/** A window over the feed, so the operator knows where to hold the label. */
const reticleStyle = css({
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "[min(80vw, 22rem)]",
  height: "[min(38vw, 10rem)]",
  border: "2px solid",
  borderColor: "gold.300",
  borderRadius: "lg",
  boxShadow: "0 0 0 100vmax rgba(18,17,16,0.45)",
  pointerEvents: "none",
});
const footerStyle = css({
  padding: "4",
  paddingBottom: "[max(1rem, env(safe-area-inset-bottom))]",
  textAlign: "center",
  fontSize: "xs",
  lineHeight: "relaxed",
  color: "rgba(255,255,255,0.75)",
});
const errorStyle = css({ color: "gold.200", fontSize: "sm" });

/**
 * Scanning with the device camera.
 *
 * On a phone or tablet there is no scanner to plug in, so the camera is the
 * only way to read a label — stocktaking on the shop floor, or looking a
 * piece up while standing with a customer, depends on this rather than on the
 * counter's USB scanner.
 *
 * The camera opens only while the sheet is up and is released as soon as it
 * closes, so the recording indicator is never left on after a scan.
 */
export function CameraScanButton({
  onScan,
  label = "Scan with camera",
}: {
  onScan: (event: ScanEvent) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  const handleScan = (event: ScanEvent) => {
    // One scan, one result: the sheet closes so the operator sees what was
    // found rather than the camera continuing to fire behind a toast.
    setOpen(false);
    onScan(event);
  };

  return (
    <>
      <button
        type="button"
        className={triggerStyle}
        onClick={() => setOpen(true)}
        aria-label={label}
        title={label}
      >
        <Camera className={css({ height: "5", width: "5" })} />
      </button>

      {open && <CameraScanSheet onScan={handleScan} onClose={() => setOpen(false)} />}
    </>
  );
}

function CameraScanSheet({
  onScan,
  onClose,
}: {
  onScan: (event: ScanEvent) => void;
  onClose: () => void;
}) {
  const { videoRef, status, error } = useCameraScanner({ active: true, onScan });

  return (
    <div className={overlayStyle} role="dialog" aria-modal="true" aria-label="Scan a barcode">
      <div className={headerStyle}>
        <span className={headingStyle}>
          {status === "scanning" ? "Point at the barcode" : "Opening camera…"}
        </span>
        <button type="button" className={closeStyle} onClick={onClose} aria-label="Close scanner">
          <X className={css({ height: "5", width: "5" })} />
        </button>
      </div>

      <div className={stageStyle}>
        <video ref={videoRef} className={videoStyle} playsInline muted />
        {status === "scanning" && <span className={reticleStyle} aria-hidden />}
      </div>

      <p className={footerStyle}>
        {/* Only ever one message: the fault if there is one, the instruction
            otherwise. */}
        {error ? (
          <span className={errorStyle}>{error}</span>
        ) : (
          "Hold the label steady inside the frame. It will be read automatically."
        )}
      </p>
    </div>
  );
}
