/**
 * Verifies the GST calculation engine without a database.
 *
 *     npx tsx scripts/verify-gst-engine.ts
 *
 * Three kinds of evidence:
 *   1. 446 cases whose expected values were produced by an independent
 *      implementation in Python (scripts/gst/generate_fixtures.py).
 *   2. Hand-worked anchors asserted literally below.
 *   3. Credit notes, place of supply and GSTIN checks.
 * Rates in the fixtures are test data, never rates approved for a product.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { calculateGst } from "../src/modules/gst/engine/calculate";
import { addCredited, creditNote, fullCredit, type Components, type InvoicedLine } from "../src/modules/gst/engine/credit";
import { allocateByWeight, mulDivRound } from "../src/modules/gst/engine/money";
import { gstinCheckCharacter, gstinProblem, placeOfSupply, stateCodeFromName } from "../src/modules/gst/places";
import type { ChargeInput, GstInput, LineResult, RateVersion } from "../src/modules/gst/engine/types";
import { check, results } from "./verify-helpers";

interface Fixture {
  label: string;
  supplyType: GstInput["supplyType"];
  pricesIncludeTax: boolean;
  goods: Array<{ lineId: string; amountCents: number; rate: string }>;
  charges?: Array<{ kind: ChargeInput["kind"]; amountCents: number; treatment: ChargeInput["treatment"]; rate?: string }>;
  mixedBasketPolicy?: GstInput["mixedBasketPolicy"];
  rates: Record<string, RateVersion>;
  expected: { lines: Array<Record<string, number | string>>; totals: Record<string, number> };
}

const KEYS = ["taxableCents", "cgstCents", "sgstCents", "igstCents", "cessCents", "taxCents", "payableCents"] as const;
const pick = (line: LineResult | Record<string, number | string>) =>
  [line.lineId, line.kind, line.inputCents, ...KEYS.map((key) => line[key])].join("|");

function main(): void {
  const fixtures = JSON.parse(readFileSync(join(__dirname, "gst", "arithmetic.fixtures.json"), "utf8")) as Fixture[];

  console.log("Engine against the independent Python fixtures");
  let mismatches = 0;
  let firstBad = "";
  for (const fixture of fixtures) {
    const rate = (id: string) => fixture.rates[id];
    const result = calculateGst({
      supplyType: fixture.supplyType,
      pricesIncludeTax: fixture.pricesIncludeTax,
      mixedBasketPolicy: fixture.mixedBasketPolicy,
      goods: fixture.goods.map((g) => ({ lineId: g.lineId, amountCents: g.amountCents, rate: rate(g.rate) })),
      charges: fixture.charges?.map((c) => ({ kind: c.kind, amountCents: c.amountCents, treatment: c.treatment, rate: c.rate ? rate(c.rate) : undefined })),
    });
    const lines = result.lines.map(pick).join(";");
    const expected = fixture.expected.lines.map(pick).join(";");
    const totalsOk = KEYS.every((key) => result.totals[key] === fixture.expected.totals[key]) &&
      result.totals.untaxedChargesCents === fixture.expected.totals.untaxedChargesCents;
    if (lines !== expected || !totalsOk) {
      mismatches++;
      firstBad ||= `${fixture.label}\n     engine   ${lines}\n     expected ${expected}`;
    }
  }
  check(`all ${fixtures.length} fixture cases agree (line by line and in total)`, mismatches, 0);
  if (firstBad) console.log("     first disagreement:", firstBad);

  console.log("Properties that must hold for every case");
  let brokenTotals = 0;
  let brokenSplit = 0;
  let brokenPayable = 0;
  for (const fixture of fixtures) {
    const r = fixture.rates;
    const result = calculateGst({
      supplyType: fixture.supplyType,
      pricesIncludeTax: fixture.pricesIncludeTax,
      mixedBasketPolicy: fixture.mixedBasketPolicy,
      goods: fixture.goods.map((g) => ({ lineId: g.lineId, amountCents: g.amountCents, rate: r[g.rate] })),
      charges: fixture.charges?.map((c) => ({ kind: c.kind, amountCents: c.amountCents, treatment: c.treatment, rate: c.rate ? r[c.rate] : undefined })),
    });
    for (const line of result.lines) {
      if (line.taxCents !== line.cgstCents + line.sgstCents + line.igstCents + line.cessCents) brokenTotals++;
      if (line.taxableCents + line.taxCents !== line.payableCents) brokenSplit++;
      if (fixture.supplyType === "INTRA_STATE" && line.igstCents !== 0) brokenSplit++;
      if (fixture.supplyType === "INTER_STATE" && (line.cgstCents !== 0 || line.sgstCents !== 0)) brokenSplit++;
      if (Math.abs(line.cgstCents - line.sgstCents) > 1 && line.rate.cgstBps === line.rate.sgstBps) brokenSplit++;
    }
    const inputs = fixture.goods.reduce((s, g) => s + g.amountCents, 0) + (fixture.charges ?? []).reduce((s, c) => s + c.amountCents, 0);
    const expectedPayable = fixture.pricesIncludeTax ? inputs : inputs + result.totals.taxCents;
    if (result.totals.payableCents !== expectedPayable) brokenPayable++;
  }
  check("tax = CGST + SGST + IGST + cess on every line", brokenTotals, 0);
  check("taxable + tax = payable; intra-state has no IGST, inter-state no CGST/SGST; CGST and SGST never differ by more than a paisa", brokenSplit, 0);
  check("the buyer's payable total is exact (inputs, plus tax only when prices exclude it)", brokenPayable, 0);

  console.log("Hand-worked anchors");
  const r3: RateVersion = { id: "R3", code: "7113", codeKind: "HSN", rateBps: 300, cgstBps: 150, sgstBps: 150, igstBps: 300, cessBps: 0 };
  const r18: RateVersion = { id: "R18", code: "9102", codeKind: "HSN", rateBps: 1800, cgstBps: 900, sgstBps: 900, igstBps: 1800, cessBps: 0 };
  const one = (amount: number, included: boolean, supply: GstInput["supplyType"], rate = r3) =>
    calculateGst({ supplyType: supply, pricesIncludeTax: included, goods: [{ lineId: "a", amountCents: amount, rate }] }).lines[0];
  let line = one(99900, true, "INTRA_STATE");
  check("Rs 999.00 incl. 3%: taxable 969.90, CGST 14.55, SGST 14.55", [line.taxableCents, line.cgstCents, line.sgstCents], [96990, 1455, 1455]);
  line = one(99900, false, "INTRA_STATE");
  check("Rs 999.00 excl. 3%: tax 29.97 on top, payable 1,028.97", [line.taxCents, line.payableCents], [2997, 102897]);
  line = one(99900, true, "INTER_STATE");
  check("Rs 999.00 incl. 3% inter-state: IGST 29.10, no CGST/SGST", [line.igstCents, line.cgstCents, line.sgstCents], [2910, 0, 0]);
  line = one(10000000, true, "INTRA_STATE", r18);
  check("Rs 1,00,000 incl. 18%: taxable 84,745.76, tax 15,254.24", [line.taxableCents, line.taxCents], [8474576, 1525424]);
  line = one(50, false, "INTRA_STATE");
  check("50 paise at 3% is 1.5 paise, which rounds half up to 2", line.taxCents, 2);

  console.log("A mixed basket, with delivery following the goods");
  const basket = (policy: "PROPORTIONAL" | "HIGHEST_RATE") =>
    calculateGst({
      supplyType: "INTRA_STATE",
      pricesIncludeTax: false,
      mixedBasketPolicy: policy,
      goods: [{ lineId: "ring", amountCents: 100000, rate: r3 }, { lineId: "watch", amountCents: 100000, rate: r18 }],
      charges: [{ kind: "SHIPPING", amountCents: 9900, treatment: "FOLLOWS_GOODS" }],
    });
  check("proportional: delivery split 50/50 and taxed at 3% and 18% (49.50 and 49.50)", basket("PROPORTIONAL").lines.filter((l) => l.kind === "SHIPPING").map((l) => [l.inputCents, l.taxCents]), [[4950, 149], [4950, 891]]);
  check("highest rate: all of the delivery taxed at 18%", basket("HIGHEST_RATE").lines.filter((l) => l.kind === "SHIPPING").map((l) => [l.inputCents, l.taxCents]), [[9900, 1782]]);
  check("a charge with treatment NONE is payable but carries no tax", calculateGst({ supplyType: "INTRA_STATE", pricesIncludeTax: false, goods: [{ lineId: "a", amountCents: 100000, rate: r3 }], charges: [{ kind: "SHIPPING", amountCents: 9900, treatment: "NONE" }] }).totals.payableCents, 100000 + 3000 + 9900);
  check("a basket of one rate gives the same answer under either policy", JSON.stringify(calculateGst({ supplyType: "INTRA_STATE", pricesIncludeTax: true, mixedBasketPolicy: "PROPORTIONAL", goods: [{ lineId: "a", amountCents: 5000, rate: r3 }, { lineId: "b", amountCents: 7000, rate: r3 }], charges: [{ kind: "SHIPPING", amountCents: 9900, treatment: "FOLLOWS_GOODS" }] }).totals), JSON.stringify(calculateGst({ supplyType: "INTRA_STATE", pricesIncludeTax: true, mixedBasketPolicy: "HIGHEST_RATE", goods: [{ lineId: "a", amountCents: 5000, rate: r3 }, { lineId: "b", amountCents: 7000, rate: r3 }], charges: [{ kind: "SHIPPING", amountCents: 9900, treatment: "FOLLOWS_GOODS" }] }).totals));

  console.log("Refusals: the engine never invents a rate or an amount");
  const throws = (run: () => unknown) => { try { run(); return false; } catch { return true; } };
  check("a charge taxed separately without a rate is refused", throws(() => calculateGst({ supplyType: "INTRA_STATE", pricesIncludeTax: false, goods: [{ lineId: "a", amountCents: 100, rate: r3 }], charges: [{ kind: "SHIPPING", amountCents: 100, treatment: "SEPARATE" }] })), true);
  check("a charge that follows goods, with no goods, is refused", throws(() => calculateGst({ supplyType: "INTRA_STATE", pricesIncludeTax: false, goods: [], charges: [{ kind: "SHIPPING", amountCents: 100, treatment: "FOLLOWS_GOODS" }] })), true);
  check("a fractional paisa is refused", throws(() => calculateGst({ supplyType: "INTRA_STATE", pricesIncludeTax: false, goods: [{ lineId: "a", amountCents: 10.5, rate: r3 }] })), true);
  check("a negative amount is refused", throws(() => calculateGst({ supplyType: "INTRA_STATE", pricesIncludeTax: false, goods: [{ lineId: "a", amountCents: -1, rate: r3 }] })), true);
  check("a rate whose parts do not add up is refused", throws(() => calculateGst({ supplyType: "INTRA_STATE", pricesIncludeTax: false, goods: [{ lineId: "a", amountCents: 100, rate: { ...r3, cgstBps: 100 } }] })), true);

  console.log("Large amounts and exact allocation");
  check("an intermediate product beyond 2^53 (8.1e16) is still computed exactly", mulDivRound(9_000_000_000_000, 9_000, 10_000), 8_100_000_000_000);
  check("a result that cannot be held exactly is refused, not rounded", throws(() => mulDivRound(9_000_000_000_000, 9_000_000_000, 10_000)), true);
  check("allocation always adds back to the amount", allocateByWeight(9900, [3, 3, 3]).reduce((a, b) => a + b, 0), 9900);
  check("allocation gives the odd paisa to the earlier entry on a tie", allocateByWeight(100, [1, 1, 1]), [34, 33, 33]);

  console.log("Credit notes at the tax that was charged");
  const original = calculateGst({ supplyType: "INTRA_STATE", pricesIncludeTax: false, goods: [{ lineId: "ring", amountCents: 100000, rate: r3 }, { lineId: "watch", amountCents: 250000, rate: r18 }] });
  const invoiced: InvoicedLine[] = original.lines.map((l) => ({ lineId: l.lineId, kind: l.kind, rate: l.rate, taxableCents: l.taxableCents, cgstCents: l.cgstCents, sgstCents: l.sgstCents, igstCents: l.igstCents, cessCents: l.cessCents, payableCents: l.payableCents }));
  const none = new Map<string, Components>();
  const part = creditNote(invoiced, none, [{ lineId: "watch", refundCents: 295000 / 2 }]);
  check("half of the watch line reverses half its tax at 18%, not at today's rate", [part.lines[0].taxableCents, part.lines[0].taxCents, part.lines[0].payableCents], [125000, 22500, 147500]);
  const afterPart = addCredited(none, part.lines);
  const finish = creditNote(invoiced, afterPart, [{ lineId: "watch", refundCents: 295000 - 147500 }]);
  check("the refund that finishes a line takes exactly what is left", finish.lines[0].finishesLine, true);
  const whole = addCredited(afterPart, finish.lines).get("watch")!;
  check("several refunds on one line add up to the line exactly", [whole.taxableCents, whole.cgstCents, whole.sgstCents, whole.payableCents], [250000, 22500, 22500, 295000]);
  let threw = throws(() => creditNote(invoiced, addCredited(afterPart, finish.lines), [{ lineId: "watch", refundCents: 1 }]));
  check("refunding more than was charged is refused", threw, true);
  threw = throws(() => creditNote(invoiced, none, [{ lineId: "ghost", refundCents: 100 }]));
  check("refunding a line that is not on the invoice is refused", threw, true);
  const thirds = invoiced.find((l) => l.lineId === "ring")!;
  let credited = new Map<string, Components>();
  let taxSeen = 0;
  for (const slice of [33333, 33333]) {
    const c = creditNote([thirds], credited, [{ lineId: "ring", refundCents: slice }]);
    credited = addCredited(credited, c.lines);
    taxSeen += c.totals.taxCents;
  }
  const last = creditNote([thirds], credited, [{ lineId: "ring", refundCents: thirds.payableCents - 66666 }]);
  taxSeen += last.totals.taxCents;
  check("three uneven slices reverse exactly the tax of the line (no drift)", taxSeen, thirds.cgstCents + thirds.sgstCents);
  check("a full credit refunds everything", fullCredit(invoiced, none).totals.payableCents, original.totals.payableCents);

  console.log("Place of supply and GSTIN");
  check("a delivered order to another state is inter-state", placeOfSupply({ channel: "ONLINE", supplierStateCode: "37", deliveryStateName: "Karnataka" })?.supplyType, "INTER_STATE");
  check("a delivered order within the supplier's state is intra-state", placeOfSupply({ channel: "ONLINE", supplierStateCode: "37", deliveryStateName: "andhra pradesh" })?.supplyType, "INTRA_STATE");
  check("a counter sale is supplied in the supplier's own state", placeOfSupply({ channel: "STORE", supplierStateCode: "37" })?.stateCode, "37");
  check("an unreadable state is NOT defaulted to the shop's own", placeOfSupply({ channel: "ONLINE", supplierStateCode: "37", deliveryStateName: "Atlantis" }), null);
  check("no supplier state means no answer, not a guess", placeOfSupply({ channel: "ONLINE", supplierStateCode: null, deliveryStateName: "Goa" }), null);
  check("state names tolerate case, punctuation and common aliases", [stateCodeFromName("  ORISSA "), stateCodeFromName("Jammu & Kashmir"), stateCodeFromName("Tamil Nadu"), stateCodeFromName("37")], ["21", "01", "33", "37"]);
  const sample = "27AAPFU0939F1ZV";
  check("the GSTIN check character matches a published sample (27AAPFU0939F1ZV)", gstinCheckCharacter(sample.slice(0, 14)), "V");
  check("a well-formed GSTIN with the right check character passes", gstinProblem(sample), null);
  check("a wrong check character is caught", gstinProblem("27AAPFU0939F1ZX"), "CHECK_CHARACTER");
  check("the placeholder GSTIN in settings is rejected", gstinProblem("GST123456789"), "FORMAT");
  check("an impossible state code is rejected", gstinProblem("40AAPFU0939F1ZV"), "STATE");

  const { passed, failed } = results();
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main();
