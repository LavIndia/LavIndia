/**
 * Checks the words-and-labels helpers GST invoices print. No database.
 *
 *     npx tsx scripts/verify-gst-format.ts
 */
import { rateLabel, rupeesInWords } from "../src/modules/gst/format";
import { check, results } from "./verify-helpers";

const words: Array<[number, string]> = [
  [0, "Rupees Zero Only"],
  [100, "Rupees One Only"],
  [1900, "Rupees Nineteen Only"],
  [2000, "Rupees Twenty Only"],
  [2500, "Rupees Twenty-Five Only"],
  [10000, "Rupees One Hundred Only"],
  [10100, "Rupees One Hundred and One Only"],
  [125640, "Rupees One Thousand Two Hundred and Fifty-Six and Forty Paise Only"],
  [10000000, "Rupees One Lakh Only"],
  [1000000000, "Rupees One Crore Only"],
  [123456789, "Rupees Twelve Lakh Thirty-Four Thousand Five Hundred and Sixty-Seven and Eighty-Nine Paise Only"],
  [5, "Rupees Zero and Five Paise Only"],
];
for (const [cents, expected] of words) check(`${cents} paise in words`, rupeesInWords(cents), expected);

for (const bad of [-1, 1.5, Number.NaN]) {
  let threw = false;
  try { rupeesInWords(bad); } catch { threw = true; }
  check(`${bad} is refused`, threw, true);
}

const labels: Array<[number, string]> = [[0, "0%"], [300, "3%"], [1800, "18%"], [150, "1.5%"], [25, "0.25%"], [525, "5.25%"]];
for (const [bps, expected] of labels) check(`${bps} bps reads ${expected}`, rateLabel(bps), expected);

  const { passed, failed } = results();
  console.log(`
${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
