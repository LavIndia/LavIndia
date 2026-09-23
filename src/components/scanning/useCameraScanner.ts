"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createBarcodeDetector } from "./barcode-detector";
import type { ScanEvent } from "./useBarcodeScanner";

/** How often to look at the camera feed. Faster than this just burns battery. */
const SAMPLE_INTERVAL_MS = 180;

/**
 * The same code is seen in many consecutive frames. Ignoring repeats for this
 * long stops one physical scan from being reported several times, which at a
 * counter would add the item three or four times over.
 */
const REPEAT_SUPPRESSION_MS = 1500;

/**
 * How long to wait before admitting the camera has not opened.
 *
 * `getUserMedia` does not resolve while the browser's permission prompt is
 * on screen, and it never resolves at all if the operator walks away from
 * that prompt or dismisses it without choosing. Left alone the sheet sits on
 * "Opening camera…" indefinitely, which looks like the feature is broken.
 */
const START_TIMEOUT_MS = 12000;

export type CameraScannerStatus = "idle" | "starting" | "scanning" | "denied" | "unsupported";

export interface CameraScannerResult {
  /** Attach to a <video> element; the stream is played through it. */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  status: CameraScannerStatus;
  /** Set when the camera could not be opened, ready to show to the operator. */
  error: string | null;
}

/**
 * Reads barcodes from the device camera.
 *
 * This is the half of scanning that a phone needs. The keyboard-wedge hook
 * covers the USB scanner at the counter, but on a phone or tablet there is no
 * scanner to plug in — the camera is the only instrument there is, so stock
 * counts and lookups away from the desk depend entirely on this path.
 *
 * The camera is opened only while `active` is true and is released the moment
 * it is not: a live camera drains the battery and, more importantly, leaves
 * the recording indicator on, which is alarming when nobody is scanning.
 */
export function useCameraScanner({
  active,
  onScan,
}: {
  active: boolean;
  onScan: (event: ScanEvent) => void;
}): CameraScannerResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onScanRef = useRef(onScan);
  const lastCodeRef = useRef<{ code: string; at: number } | null>(null);
  const [status, setStatus] = useState<CameraScannerStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const report = useCallback((code: string) => {
    const now = Date.now();
    const last = lastCodeRef.current;
    if (last && last.code === code && now - last.at < REPEAT_SUPPRESSION_MS) return;
    lastCodeRef.current = { code, at: now };
    onScanRef.current({ code, source: "CAMERA" });
  }, []);

  useEffect(() => {
    if (!active) {
      setStatus("idle");
      setError(null);
      return;
    }

    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
    };

    const start = async () => {
      setStatus("starting");
      setError(null);

      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("unsupported");
        // A browser only exposes the camera on a secure origin, so over plain
        // http on a LAN address the API is simply absent. Saying "this
        // browser cannot open the camera" there sends the operator looking
        // for a fault in their phone, when the page just needs https or
        // localhost. The two cases are told apart and named.
        setError(
          typeof window !== "undefined" && !window.isSecureContext
            ? "The camera needs a secure connection. Open this page over https, or on localhost, " +
              "and it will work. You can still read a saved photo of the label."
            : "This browser cannot open the camera. You can still read a saved photo of the label.",
        );
        return;
      }

      const detector = await createBarcodeDetector();
      if (cancelled) return;
      if (!detector) {
        setStatus("unsupported");
        setError("This browser cannot read barcodes from the camera.");
        return;
      }

      const waitingNotice = setTimeout(() => {
        if (!cancelled) {
          setError(
            "Still waiting for the camera. Check for a permission request from your browser.",
          );
        }
      }, START_TIMEOUT_MS);

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          // The rear camera is the one pointed at the label. `ideal` rather
          // than `exact` so a laptop with only a front camera still works.
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
      } catch (cause) {
        clearTimeout(waitingNotice);
        if (cancelled) return;
        const denied = cause instanceof DOMException && cause.name === "NotAllowedError";
        setStatus(denied ? "denied" : "unsupported");
        setError(
          denied
            ? "Camera access was blocked. Allow it in your browser settings to scan."
            : "No camera could be opened on this device.",
        );
        return;
      }

      clearTimeout(waitingNotice);
      setError(null);
      if (cancelled) {
        stop();
        return;
      }

      const video = videoRef.current;
      if (!video) {
        stop();
        return;
      }

      video.srcObject = stream;
      // Required by iOS Safari, which otherwise takes the video fullscreen
      // and hides the rest of the screen the operator is working in.
      video.setAttribute("playsinline", "true");
      video.muted = true;
      try {
        await video.play();
      } catch {
        // Autoplay refusal is not fatal — the frames are still readable.
      }
      if (cancelled) {
        stop();
        return;
      }
      setStatus("scanning");

      timer = setInterval(async () => {
        const source = videoRef.current;
        if (!source || source.readyState < 2) return;
        try {
          const found = await detector.detect(source);
          const code = found[0]?.rawValue?.trim();
          if (code) report(code);
        } catch {
          // A single unreadable frame is normal; the next one is along in a
          // fraction of a second.
        }
      }, SAMPLE_INTERVAL_MS);
    };

    void start();

    return () => {
      cancelled = true;
      stop();
    };
  }, [active, report]);

  return { videoRef, status, error };
}
