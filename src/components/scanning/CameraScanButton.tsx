"use client";

import { useRef, useState } from "react";
import { Camera, ImageUp, X } from "lucide-react";
import { css } from "styled-system/css";
import { readBarcodeFromFile } from "./barcode-detector";
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
const uploadRowStyle = css({
  display: "flex",
  justifyContent: "center",
  paddingX: "4",
  paddingBottom: "2",
});
const uploadButtonStyle = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "2",
  minHeight: "11",
  paddingX: "4",
  borderRadius: "full",
  border: "1px solid",
  borderColor: "rgba(255,255,255,0.25)",
  background: "rgba(255,255,255,0.10)",
  color: "white",
  fontSize: "sm",
  cursor: "pointer",
  _hover: { background: "rgba(255,255,255,0.18)" },
  _disabled: { opacity: 0.6, cursor: "default" },
  "&:focus-visible": { outline: "none", boxShadow: "0 0 0 3px rgba(255,255,255,0.4)" },
});
const hiddenInputStyle = css({ display: "none" });

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
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [reading, setReading] = useState(false);
  const [fileNotice, setFileNotice] = useState<string | null>(null);

  /**
   * Reading a label from a picture rather than from the live feed.
   *
   * A camera cannot read a barcode off a monitor: on screen the bars come out
   * barely a pixel wide, which is under what any decoder can resolve, so the
   * label sheet looks broken when it is only being viewed rather than
   * printed. Pointing at a saved photograph or a screenshot instead settles
   * the question without anyone having to print a sheet first, and it doubles
   * as a way to look up a piece from a picture a supplier sent.
   */
  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setReading(true);
    setFileNotice(null);

    const outcome = await readBarcodeFromFile(file);
    setReading(false);

    if (outcome.status === "found") {
      onScan({ code: outcome.code, source: "CAMERA" });
      return;
    }

    setFileNotice(
      outcome.status === "not-found"
        ? "No barcode found in that image. A tighter crop around the bars usually reads."
        : outcome.status === "unreadable"
          ? "That file could not be opened as an image."
          : "This browser cannot read barcodes.",
    );
  };

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

      <div className={uploadRowStyle}>
        <button
          type="button"
          className={uploadButtonStyle}
          onClick={() => fileRef.current?.click()}
          disabled={reading}
        >
          <ImageUp className={css({ height: "4", width: "4" })} />
          {reading ? "Reading…" : "Read from a photo"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className={hiddenInputStyle}
          onChange={(event) => {
            void handleFile(event.target.files?.[0]);
            // Cleared so choosing the same file twice still fires a change.
            event.target.value = "";
          }}
        />
      </div>

      <p className={footerStyle}>
        {/* Only ever one message: the fault if there is one, the instruction
            otherwise. */}
        {fileNotice ? (
          <span className={errorStyle}>{fileNotice}</span>
        ) : error ? (
          <span className={errorStyle}>{error}</span>
        ) : (
          "Hold the label steady inside the frame, or read a saved photo of one."
        )}
      </p>
    </div>
  );
}
