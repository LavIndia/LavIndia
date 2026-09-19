/**
 * Code 128 symbology.
 *
 * Written rather than installed: Code 128 is a lookup table and a weighted
 * checksum, and the libraries that wrap it draw to a canvas, which prints
 * soft. Emitting SVG rectangles keeps every bar edge crisp at any label size,
 * which is what a scanner actually needs.
 *
 * IMPORTANT: these are LavIndia-internal codes. They are NOT registered
 * EAN/GTIN numbers and are meaningless outside our own systems. Nothing in
 * the application may describe them as retail barcodes.
 */

/**
 * The 107 Code 128 patterns, as bar/space module widths.
 *
 * Each entry is six digits — bar, space, bar, space, bar, space — summing to
 * 11 modules. The final entry (STOP) is seven elements and 13 modules.
 */
const PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312",
  "132212", "221213", "221312", "231212", "112232", "122132", "122231", "113222",
  "123122", "123221", "223211", "221132", "221231", "213212", "223112", "312131",
  "311222", "321122", "321221", "312212", "322112", "322211", "212123", "212321",
  "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121",
  "313121", "211331", "231131", "213113", "213311", "213131", "311123", "311321",
  "331121", "312113", "312311", "332111", "314111", "221411", "431111", "111224",
  "111422", "121124", "121421", "141122", "141221", "112214", "112412", "122114",
  "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112",
  "421211", "212141", "214121", "412121", "111143", "111341", "131141", "114113",
  "114311", "411113", "411311", "113141", "114131", "311141", "411131", "211412",
  "211214", "211232", "2331112",
];

/** Code B: printable ASCII 32–126, one symbol per character. */
const START_B = 104;
const STOP = 106;

export class UnsupportedBarcodeCharacterError extends Error {
  constructor(char: string) {
    super(`Code 128 cannot encode ${JSON.stringify(char)}`);
    this.name = "UnsupportedBarcodeCharacterError";
  }
}

/**
 * Turns a string into Code 128 symbol values, including start, checksum and
 * stop. Code B throughout: our codes are short and alphanumeric, so the
 * digit-pair compression of Code C would save a few millimetres at the cost
 * of switching logic that could silently mis-encode.
 */
function encodeToValues(text: string): number[] {
  const values: number[] = [START_B];

  for (const char of text) {
    const code = char.charCodeAt(0);
    if (code < 32 || code > 126) throw new UnsupportedBarcodeCharacterError(char);
    values.push(code - 32);
  }

  // Modulo-103 checksum, weighted by position. The start value has weight 1.
  let checksum = START_B;
  for (let i = 1; i < values.length; i++) {
    checksum += values[i] * i;
  }
  values.push(checksum % 103);
  values.push(STOP);

  return values;
}

/** One bar in the rendered symbol, in modules from the left edge. */
export interface BarcodeBar {
  x: number;
  width: number;
}

export interface Code128Symbol {
  bars: BarcodeBar[];
  /** Total width in modules, so callers can scale without re-measuring. */
  totalModules: number;
}

/**
 * Lays the symbol out as bars. Patterns alternate bar, space, bar, space…
 * beginning with a bar, so only the odd-indexed runs are drawn.
 */
export function buildCode128(text: string): Code128Symbol {
  const values = encodeToValues(text);
  const bars: BarcodeBar[] = [];
  let x = 0;

  for (const value of values) {
    const pattern = PATTERNS[value];
    for (let i = 0; i < pattern.length; i++) {
      const width = Number(pattern[i]);
      // Even index = bar, odd index = space.
      if (i % 2 === 0) bars.push({ x, width });
      x += width;
    }
  }

  return { bars, totalModules: x };
}

export interface Code128SvgOptions {
  /** Width of one module in user units. Bigger means a wider, easier scan. */
  moduleWidth?: number;
  height?: number;
  /** Quiet zone each side, in modules. The spec requires at least 10. */
  quietZoneModules?: number;
}

/**
 * Renders the symbol as an SVG string.
 *
 * The quiet zone is not decoration: a scanner needs clear space either side
 * to find the symbol's edges, and labels that omit it are the single most
 * common reason a barcode "does not scan".
 */
export function code128Svg(text: string, options: Code128SvgOptions = {}): string {
  const moduleWidth = options.moduleWidth ?? 1;
  const height = options.height ?? 40;
  const quietZone = options.quietZoneModules ?? 10;

  const { bars, totalModules } = buildCode128(text);
  const widthModules = totalModules + quietZone * 2;
  const width = widthModules * moduleWidth;

  const rects = bars
    .map(
      (bar) =>
        `<rect x="${((bar.x + quietZone) * moduleWidth).toFixed(3)}" y="0" ` +
        `width="${(bar.width * moduleWidth).toFixed(3)}" height="${height}" />`,
    )
    .join("");

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width.toFixed(3)} ${height}" ` +
    `width="${width.toFixed(3)}" height="${height}" shape-rendering="crispEdges" ` +
    `role="img" aria-label="Barcode ${text}">` +
    `<rect width="100%" height="100%" fill="#fff"/>` +
    `<g fill="#000">${rects}</g>` +
    `</svg>`
  );
}
