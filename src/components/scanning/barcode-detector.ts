"use client";

/**
 * Getting a barcode reader, and reading a still image with it.
 *
 * Held apart from the camera hook because there are two ways a label reaches
 * us and only one of them is a live camera. The other is a photograph: the
 * operator takes a picture of the label, or screenshots the label sheet
 * before printing it, and wants to know whether it reads. Both go through the
 * same detector so a code that scans one way scans the other.
 */

/**
 * The barcode symbologies worth looking for.
 *
 * Code 128 is what LavIndia prints. The retail symbologies are included as
 * well so a supplier's carton or a bought-in piece can be read without
 * changing anything — narrowing the list also makes detection faster, so
 * there is no point listing formats that will never appear.
 */
export const BARCODE_FORMATS = [
  "code_128",
  "code_39",
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "itf",
];

export type DetectorLike = {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
};

/**
 * Loads a barcode detector, preferring the browser's own.
 *
 * Chrome on Android implements `BarcodeDetector` natively, which is fast and
 * costs nothing to ship. Safari on iOS does not, and iPhones are half of what
 * a shop actually holds — so the ponyfill is fetched only on those devices,
 * keeping the download off the browsers that do not need it.
 */
export async function createBarcodeDetector(): Promise<DetectorLike | null> {
  const native = (globalThis as { BarcodeDetector?: new (o: object) => DetectorLike })
    .BarcodeDetector;
  if (native) {
    try {
      return new native({ formats: BARCODE_FORMATS });
    } catch {
      // A browser that has the constructor but rejects these formats is
      // treated as unsupported; the ponyfill below handles it.
    }
  }

  try {
    const { BarcodeDetector } = await import("barcode-detector/ponyfill");
    // The ponyfill's own format union is narrower than the string list above;
    // every entry in BARCODE_FORMATS is one it supports, so the cast is safe.
    return new BarcodeDetector({ formats: BARCODE_FORMATS as never });
  } catch {
    return null;
  }
}

export type ImageScanOutcome =
  | { status: "found"; code: string }
  | { status: "not-found" }
  | { status: "unreadable" }
  | { status: "unsupported" };

/**
 * Enlarges the image before looking at it.
 *
 * A screenshot of a label sheet renders the bars at barely more than one
 * pixel each, which is under what any decoder can resolve. Scaling up with
 * smoothing switched off turns each of those pixels into a clean block
 * rather than a blurred ramp, which is frequently the difference between a
 * screenshot that reads and one that does not. The source is left alone when
 * it is already big enough to be worth reading directly.
 */
function upscale(bitmap: ImageBitmap, minWidth: number): CanvasImageSource {
  if (bitmap.width >= minWidth) return bitmap;

  const scale = Math.min(6, Math.ceil(minWidth / Math.max(1, bitmap.width)));
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width * scale;
  canvas.height = bitmap.height * scale;

  const context = canvas.getContext("2d");
  if (!context) return bitmap;

  context.imageSmoothingEnabled = false;
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/**
 * Reads the first barcode in an image file.
 *
 * Tries the image as supplied first, then enlarged. Two passes rather than
 * one because upscaling helps a small screenshot and does nothing for a
 * decent photograph, and there is no way to tell which one has arrived
 * without looking.
 */
export async function readBarcodeFromFile(file: File): Promise<ImageScanOutcome> {
  const detector = await createBarcodeDetector();
  if (!detector) return { status: "unsupported" };

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { status: "unreadable" };
  }

  try {
    for (const source of [bitmap, upscale(bitmap, 1600)]) {
      try {
        const found = await detector.detect(source);
        const code = found[0]?.rawValue?.trim();
        if (code) return { status: "found", code };
      } catch {
        // One pass failing is not the end of it; the other may still read.
      }
    }
    return { status: "not-found" };
  } finally {
    bitmap.close();
  }
}
