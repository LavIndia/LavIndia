/**
 * Checks the Code 128 encoder against known-correct output.
 *
 * A barcode that renders but encodes wrongly is the worst kind of bug: it
 * looks perfect on screen and on the label, and only fails at the counter in
 * front of a customer. These cases pin the checksum, the symbol layout and
 * the quiet zone, all of which are easy to get subtly wrong.
 *
 *     npx tsx scripts/verify-code128.ts
 */
import { buildCode128, code128Svg } from "../src/modules/catalog/barcodes/code128";

/**
 * The pattern table, inverted. Written out here on purpose rather than
 * imported, so a typo in the encoder's table cannot be mirrored by the test.
 */
const PATTERN_LOOKUP = new Map<string, number>(
  [
    "212222","222122","222221","121223","121322","131222","122213","122312",
    "132212","221213","221312","231212","112232","122132","122231","113222",
    "123122","123221","223211","221132","221231","213212","223112","312131",
    "311222","321122","321221","312212","322112","322211","212123","212321",
    "232121","111323","131123","131321","112313","132113","132311","211313",
    "231113","231311","112133","112331","132131","113123","113321","133121",
    "313121","211331","231131","213113","213311","213131","311123","311321",
    "331121","312113","312311","332111","314111","221411","431111","111224",
    "111422","121124","121421","141122","141221","112214","112412","122114",
    "122411","142112","142211","241211","221114","413111","241112","134111",
    "111242","121142","121241","114212","124112","124211","411212","421112",
    "421211","212141","214121","412121","111143","111341","131141","114113",
    "114311","411113","411311","113141","114131","311141","411131","211412",
    "211214","211232","2331112",
  ].map((pattern, value) => [pattern, value]),
);

let passed = 0;
let failed = 0;

function check(label: string, actual: unknown, expected: unknown): void {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed++;
    console.log(`  PASS  ${label}`);
  } else {
    failed++;
    console.log(`  FAIL  ${label}\n          expected ${JSON.stringify(expected)}\n          actual   ${JSON.stringify(actual)}`);
  }
}

/**
 * Decodes a built symbol back into text, independently of the encoder.
 *
 * This is the check that matters. Comparing the encoder against itself proves
 * nothing; reading the bars back the way a scanner would is what catches a
 * transposed digit in the pattern table — the one defect that produces a
 * barcode which looks perfect and scans as the wrong product.
 */
function decodeSymbol(text: string): { decoded: string; startValue: number; checksumValid: boolean } {
  const { bars, totalModules } = buildCode128(text);

  // Rebuild the full bar/space run sequence; the encoder only reports bars.
  const runs: number[] = [];
  let cursor = 0;
  for (const bar of bars) {
    if (bar.x > cursor) runs.push(bar.x - cursor);
    runs.push(bar.width);
    cursor = bar.x + bar.width;
  }
  if (cursor < totalModules) runs.push(totalModules - cursor);

  // Every symbol is six runs, except STOP which is seven.
  const values: number[] = [];
  for (let i = 0; i + 7 <= runs.length; i += 6) {
    const isStop = i + 7 === runs.length;
    const pattern = runs.slice(i, i + (isStop ? 7 : 6)).join("");
    values.push(PATTERN_LOOKUP.get(pattern) ?? -1);
    if (isStop) break;
  }

  const startValue = values[0];
  const stopValue = values[values.length - 1];
  const checksum = values[values.length - 2];
  const data = values.slice(1, values.length - 2);

  let sum = startValue;
  data.forEach((value, index) => {
    sum += value * (index + 1);
  });

  return {
    decoded: data.map((v) => String.fromCharCode(v + 32)).join(""),
    startValue,
    checksumValid: sum % 103 === checksum && stopValue === 106,
  };
}

function main(): void {
  console.log("\nCode 128 encoder\n");

  // Round-trip: encode, then read the bars back as a scanner would.
  for (const text of ["A", "HI345678", "LAV0000000190", "LAV-GOLDWRAP-00189"]) {
    const { decoded, startValue, checksumValid } = decodeSymbol(text);
    check(`"${text}" decodes back to itself`, decoded, text);
    check(`"${text}" uses START B`, startValue, 104);
    check(`"${text}" has a valid checksum and stop`, checksumValid, true);
  }

  // Module arithmetic: start + data + checksum + stop.
  // Each symbol is 11 modules; STOP is 13.
  for (const text of ["A", "HI345678", "LAV0000000190"]) {
    const { totalModules } = buildCode128(text);
    const symbols = 1 + text.length + 1; // start + data + checksum
    check(`"${text}" spans ${symbols * 11 + 13} modules`, totalModules, symbols * 11 + 13);
  }

  // A Code 128 symbol always begins and ends with a bar.
  const { bars, totalModules } = buildCode128("LAV0000000190");
  check("starts with a bar at module 0", bars[0].x, 0);
  const last = bars[bars.length - 1];
  check("final bar reaches the end", last.x + last.width, totalModules);

  // Every bar must sit inside the symbol and have a width of 1–4 modules.
  check(
    "all bar widths are legal (1–4 modules)",
    bars.every((b) => b.width >= 1 && b.width <= 4),
    true,
  );
  check(
    "no bar overlaps the next",
    bars.every((b, i) => i === 0 || b.x >= bars[i - 1].x + bars[i - 1].width),
    true,
  );

  // The quiet zone is what most "it will not scan" labels are missing.
  const svg = code128Svg("LAV0000000190", { moduleWidth: 2, height: 50, quietZoneModules: 10 });
  const firstRectX = Number(/<g fill="#000"><rect x="([\d.]+)"/.exec(svg)?.[1] ?? -1);
  check("quiet zone of 10 modules precedes the first bar", firstRectX, 20);
  check("svg declares its height", /height="50"/.test(svg), true);
  check("svg renders crisp edges", svg.includes('shape-rendering="crispEdges"'), true);
  check("svg has a white background", svg.includes('<rect width="100%" height="100%" fill="#fff"/>'), true);

  // Characters outside Code B must be refused, not silently mangled.
  let refused = false;
  try {
    buildCode128("café");
  } catch {
    refused = true;
  }
  check("refuses characters Code B cannot encode", refused, true);

  // Different codes must not produce identical symbols.
  check(
    "distinct codes give distinct symbols",
    code128Svg("LAV0000000190") === code128Svg("LAV0000000191"),
    false,
  );

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exitCode = 1;
}

main();
