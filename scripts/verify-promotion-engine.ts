/**
 * Proves the promotion engine against the worked examples in the Promotion
 * Builder design, to the paisa. Pure — touches no database.
 *
 *   npx tsx scripts/verify-promotion-engine.ts
 */
import { evaluatePromotions } from "../src/modules/promotions/engine/evaluate";
import type {
  Benefit,
  EngineContext,
  EngineLine,
  EnginePromotion,
  PieceFilter,
} from "../src/modules/promotions/contracts";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : `\n        expected ${JSON.stringify(expected)}\n        actual   ${JSON.stringify(actual)}`}`);
}

const ALL: PieceFilter = { include: [], exclude: [] };
const cat = (id: string): PieceFilter => ({ include: [{ type: "categories", ids: [id] }], exclude: [] });

let seq = 0;
function promo(benefit: Benefit, over: Partial<EnginePromotion> = {}): EnginePromotion {
  seq += 1;
  return {
    id: `p${seq}`,
    label: `Offer ${seq}`,
    invoiceLabel: null,
    trigger: "AUTOMATIC",
    codes: [],
    channels: ["ONLINE", "STORE"],
    schedule: {
      startsAt: null, endsAt: null, isRecurring: false, recurrenceType: null,
      recurrenceDaysOfWeek: [], recurrenceDayOfMonth: null,
      recurrenceStartTime: null, recurrenceEndTime: null,
    },
    pieces: ALL,
    minQuantity: null,
    minSubtotalCents: null,
    conditions: [],
    benefit,
    priceIncludesTax: false,
    maxApplicationsPerOrder: null,
    maxDiscountCents: null,
    combinesWithOtherClasses: false,
    exclusive: false,
    rank: null,
    createdAt: new Date(2026, 0, seq),
    ...over,
  };
}

function line(id: string, rupees: number, categoryId = "bangles", quantity = 1): EngineLine {
  return {
    lineId: id, variantId: `v-${id}`, productId: `pr-${id}`, categoryId,
    collectionIds: [], material: null, color: null, size: null,
    unitPriceCents: rupees * 100, quantity,
  };
}

const ctx: EngineContext = {
  channel: "ONLINE", now: new Date(), codes: [],
  customer: { id: null, previousOrderCount: 0 },
  paymentMethod: null, shippingCents: 0, taxRateBps: 300,
};

/** Per-line GST on the net, half-up — as the invoice will do it. */
function totals(lines: EngineLine[], promotions: EnginePromotion[], context = ctx) {
  const result = evaluatePromotions(lines, promotions, context);
  const perUnit = result.units.map((u) => u.discountCents);
  const tax = result.units.reduce((sum, u) => sum + Math.round(((u.listCents - u.discountCents) * 300) / 10_000), 0);
  const net = result.listSubtotalCents - result.pieceDiscountCents - result.orderDiscountCents;
  return { result, perUnit, net, tax, total: net + tax };
}

// 1. Any 3 for ₹999 --------------------------------------------------------
{
  const t = totals([line("a", 399), line("b", 499), line("c", 599)], [
    promo({ type: "setPrice", setSize: 3, priceCents: 99_900 }),
  ]);
  check("1 Any 3 for ₹999: split 132.73 / 166.00 / 199.27", t.perUnit, [13_273, 16_600, 19_927]);
  check("1 net ₹999.00, GST ₹29.97, total ₹1,028.97", [t.net, t.tax, t.total], [99_900, 2_997, 102_897]);
}

// 2. Any 2 for ₹1,299 --------------------------------------------------------
{
  const t = totals([line("a", 799), line("b", 899)], [promo({ type: "setPrice", setSize: 2, priceCents: 129_900 })]);
  check("2 Any 2 for ₹1,299: split 187.75 / 211.25", t.perUnit, [18_775, 21_125]);
  check("2 GST ₹38.97, total ₹1,337.97", [t.tax, t.total], [3_897, 133_797]);
  const cheap = totals([line("a", 499), line("b", 599)], [promo({ type: "setPrice", setSize: 2, priceCents: 129_900 })]);
  check("2 never raises a price (₹1,098 cart)", cheap.result.applied.length, 0);
}

// 3. Buy 1 Get 1 Free --------------------------------------------------------
{
  const t = totals([line("a", 1200), line("b", 900)], [
    promo({ type: "reward", buyQuantity: 1, getQuantity: 1, gets: null, value: { type: "percent", bps: 10_000 }, pick: "CHEAPEST" }),
  ]);
  check("3 BOGO: split 514.29 / 385.71", t.perUnit, [51_429, 38_571]);
  check("3 GST ₹36.00, total ₹1,236.00", [t.tax, t.total], [3_600, 123_600]);
}

// 4. Buy 2 Get 1 Free ----------------------------------------------------------
{
  const b2g1 = () => promo({ type: "reward", buyQuantity: 2, getQuantity: 1, gets: null, value: { type: "percent", bps: 10_000 }, pick: "CHEAPEST" });
  const t = totals([line("n", 1500), line("b", 1200), line("r", 800)], [b2g1()]);
  check("4 B2G1: split 342.86 / 274.28 / 182.86", t.perUnit, [34_286, 27_428, 18_286]);
  check("4 GST ₹80.99 (sum of lines), total ₹2,780.99", [t.tax, t.total], [8_099, 278_099]);
  const six = totals([1500, 1200, 1000, 900, 800, 700].map((r, i) => line(`s${i}`, r)), [b2g1()]);
  check("4 six pieces: the two cheapest are free (₹1,500 off)", six.result.pieceDiscountCents, 150_000);
}

// 5. Necklace + Earrings = ₹1,499 ----------------------------------------------
{
  const t = totals([line("n", 1299, "necklaces"), line("e", 699, "earrings"), line("r", 599, "rings")], [
    promo({ type: "bundle", priceCents: 149_900, components: [{ pieces: cat("necklaces"), quantity: 1 }, { pieces: cat("earrings"), quantity: 1 }] }),
  ]);
  check("5 Bundle: split 324.42 / 174.58 / 0", t.perUnit, [32_442, 17_458, 0]);
  check("5 GST ₹62.94, total ₹2,160.94", [t.tax, t.total], [6_294, 216_094]);
}

// 6. Tiers 2→₹699, 3→₹999, 4→₹1,299 --------------------------------------------
{
  const tiers = () => promo({ type: "setPriceTiers", leftovers: "NEW_SET", tiers: [{ size: 2, priceCents: 69_900 }, { size: 3, priceCents: 99_900 }, { size: 4, priceCents: 129_900 }] });
  const four = totals([599, 499, 449, 399].map((r, i) => line(`t${i}`, r)), [tiers()]);
  check("6 four pieces: set of 4, split 199.15/165.91/149.28/132.66", four.perUnit, [19_915, 16_591, 14_928, 13_266]);
  check("6 four pieces: total ₹1,337.97", four.total, 133_797);
  const mixed = totals([599, 499, 449, 399, 349].map((r, i) => line(`m${i}`, r)), [tiers()]);
  check("6 five mixed: set of 4 + ₹349 full, total ₹1,697.44", [mixed.net, mixed.total], [164_800, 169_744]);
  const same = totals([line("x", 599, "bangles", 5)], [tiers()]);
  check("6 five at ₹599: sets of 3 and 2 (₹1,698), not 4+1", same.net, 169_800);
  check("6 five at ₹599: total ₹1,748.95", same.total, 174_895);
}

// Conflicts: Any 3 for ₹999 against 10% off Bangles ------------------------------
{
  const cart = () => [line("a", 399), line("b", 499), line("c", 599)];
  const set = () => promo({ type: "setPrice", setSize: 3, priceCents: 99_900 });
  const tenPiece = () => promo({ type: "percentOff", bps: 1_000 }, { pieces: cat("bangles") });

  const a = totals(cart(), [set(), tenPiece()]);
  check("T-A set wins, ₹999.00", a.net, 99_900);
  check("T-A 10% rejected as saving ₹348.30 less", a.result.rejected.map((r) => [r.reason, r.shortfallCents]), [["SAVES_LESS", 34_830]]);

  const a2 = totals([...cart(), line("d", 399)], [set(), tenPiece()]);
  check("T-A' four bangles: set + 10% on the leftover, ₹1,358.10", a2.net, 135_810);

  const coupon = promo({ type: "percentOffOrder", bps: 1_000 }, { trigger: "CODE", codes: ["BANGLE10"] });
  const b = totals(cart(), [set(), coupon], { ...ctx, codes: ["bangle10"] });
  check("T-B coupon cannot combine: set kept, code unused", [b.net, b.result.unusedCodes], [99_900, ["BANGLE10"]]);

  const c = totals(cart(), [
    promo({ type: "setPrice", setSize: 3, priceCents: 99_900 }, { combinesWithOtherClasses: true }),
    promo({ type: "percentOffOrder", bps: 1_000 }, { trigger: "CODE", codes: ["BANGLE10"], combinesWithOtherClasses: true }),
  ], { ...ctx, codes: ["BANGLE10"] });
  check("T-C both combine: ₹899.10", c.net, 89_910);

  const d = totals(cart(), [set(), promo({ type: "percentOff", bps: 1_000 }, { exclusive: true })]);
  check("T-D exclusive 10% wins outright: ₹1,347.30", d.net, 134_730);
}

// Nudges and limits ---------------------------------------------------------------
{
  const two = totals([line("a", 399), line("b", 499)], [promo({ type: "setPrice", setSize: 3, priceCents: 99_900 })]);
  check("Nudge: add 1 more for the set", two.result.nudges.map((n) => n.remainingQuantity), [1]);

  const capped = totals([line("a", 10_000)], [promo({ type: "percentOff", bps: 5_000 }, { maxDiscountCents: 100_000 })]);
  check("Cap: 50% off ₹10,000 held to ₹1,000", capped.result.pieceDiscountCents, 100_000);

  const spend = totals([line("a", 6_000)], [promo({ type: "orderTiers", tiers: [{ minSubtotalCents: 500_000, amountOffCents: 50_000 }, { minSubtotalCents: 1_000_000, amountOffCents: 120_000 }] })]);
  check("Spend ₹5,000 get ₹500 off, nudge ₹4,000 to the next tier", [spend.result.orderDiscountCents, spend.result.nudges[0]?.remainingCents], [50_000, 400_000]);

  const locked = totals([{ ...line("a", 999), locked: true }], [promo({ type: "percentOff", bps: 1_000 })]);
  check("A manually priced line takes no piece offer", locked.result.pieceDiscountCents, 0);

  const store = totals([line("a", 999)], [promo({ type: "percentOff", bps: 1_000 }, { channels: ["STORE"] })]);
  check("A store-only offer does not apply online", store.result.applied.length, 0);

  const necklaceEarrings = totals([line("n", 2000, "necklaces"), line("e", 800, "earrings")], [
    promo({ type: "reward", buyQuantity: 1, getQuantity: 1, gets: cat("earrings"), value: { type: "percent", bps: 5_000 }, pick: "CHEAPEST" }, { pieces: cat("necklaces") }),
  ]);
  check("Buy a necklace, earrings at 50%: ₹400 off", necklaceEarrings.result.pieceDiscountCents, 40_000);

  const incl = totals([line("a", 399), line("b", 499), line("c", 599)], [promo({ type: "setPrice", setSize: 3, priceCents: 99_900 }, { priceIncludesTax: true })]);
  check("Set price including GST: pre-tax ₹969.90", incl.net, 96_990);
}

// Selection semantics ---------------------------------------------------------
{
  const bangleBand = promo({ type: "percentOff", bps: 1_000 }, {
    pieces: { include: [{ type: "categories", ids: ["bangles"] }, { type: "priceRange", minCents: 29_900, maxCents: 69_900 }], exclude: [] },
  });
  const t = totals([line("in", 499), line("dear", 999), line("ring", 499, "rings")], [bangleBand]);
  check("Bangles ₹299–₹699 means bangles WITHIN that price, not every piece at it", t.perUnit, [4_990, 0, 0]);
  const above = promo({ type: "percentOff", bps: 1_000 }, { pieces: { include: [{ type: "priceRange", minCents: 2_00_001 }], exclude: [] } });
  const u = totals([line("a", 2_499, "necklaces"), line("b", 1_999, "necklaces")], [above]);
  check("A price rule alone applies across every piece", u.perUnit, [24_990, 0]);
}

// Several groups of pieces, each narrowed on its own -----------------------------
{
  const mixed = promo({ type: "setPrice", setSize: 3, priceCents: 99_900 }, {
    pieces: {
      include: [{ type: "categories", ids: ["earrings"] }, { type: "priceRange", minCents: 20_000, maxCents: 40_000 }],
      or: [[{ type: "categories", ids: ["necklaces"] }, { type: "colors", values: ["Black"] }, { type: "priceRange", maxCents: 59_999 }]],
      exclude: [],
    },
  });
  const black = { ...line("n1", 550, "necklaces"), color: "Black" };
  const gold = { ...line("n2", 550, "necklaces"), color: "Gold" };
  const dearBlack = { ...line("n3", 650, "necklaces"), color: "black" };
  const t = totals([line("e1", 300, "earrings"), line("e2", 450, "earrings"), black, gold, dearBlack, line("e3", 390, "earrings")], [mixed]);
  check("Earrings ₹200–₹400 OR black necklaces under ₹600: only those three form the set",
    t.perUnit.map((d) => d > 0), [true, false, true, false, false, true]);
}

// Piece Sets --------------------------------------------------------------------
{
  const festive = { id: "s1", name: "Festive", match: "ALL" as const, rules: [{ field: "tag" as const, op: "is" as const, values: ["festive-edit"] }, { field: "price" as const, op: "under" as const, maxCents: 50_000 }], includeProductIds: ["pr-vip"], excludeProductIds: ["pr-no"] };
  const blackNecklaces = { id: "s2", name: "Black necklaces", match: "ALL" as const, rules: [{ field: "category" as const, op: "is" as const, values: ["necklaces"] }, { field: "colour" as const, op: "is" as const, values: ["black"] }], includeProductIds: [], excludeProductIds: [] };
  const offer = promo({ type: "percentOff", bps: 1_000 }, { pieces: { include: [], exclude: [], setIds: ["s1", "s2"], sets: [festive, blackNecklaces] } });
  const t = totals([
    { ...line("tagged", 400, "earrings"), tags: ["festive-edit"] },
    { ...line("dear", 700, "earrings"), tags: ["festive-edit"] },
    { ...line("vip", 900, "rings"), productId: "pr-vip" },
    { ...line("no", 300, "earrings"), productId: "pr-no", tags: ["festive-edit"] },
    { ...line("blk", 800, "necklaces"), color: "Black" },
    line("plain", 300, "earrings"),
  ], [offer]);
  check("Sets: tagged under ₹500, always-in, never-in, or black necklaces", t.perUnit.map((d) => d > 0), [true, false, true, false, true, false]);
  const gone = promo({ type: "percentOff", bps: 1_000 }, { pieces: { include: [], exclude: [], setIds: ["deleted"], sets: [] } });
  check("A deleted set matches nothing — it never widens to every piece", totals([line("x", 500)], [gone]).result.applied.length, 0);
}

// Sets plus pieces picked by name ----------------------------------------------------
{
  const earrings = { id: "c", name: "Earrings", match: "ALL" as const, rules: [{ field: "category" as const, op: "is" as const, values: ["earrings"] }], includeProductIds: [], excludeProductIds: [] };
  const offer = promo({ type: "percentOff", bps: 1_000 }, { pieces: { include: [{ type: "products", ids: ["pr-ring"] }], exclude: [{ type: "products", ids: ["pr-e2"] }], setIds: ["c"], sets: [earrings] } });
  const t = totals([line("e1", 500, "earrings"), line("e2", 500, "earrings"), line("ring", 900, "rings"), line("neck", 900, "necklaces")], [offer]);
  check("A set, a piece by name, and one left out", t.perUnit.map((d) => d > 0), [true, false, true, false]);
  const onlyNamed = promo({ type: "percentOff", bps: 1_000 }, { pieces: { include: [{ type: "products", ids: ["pr-ring"] }], exclude: [] } });
  check("Only pieces picked by name", totals([line("ring", 900, "rings"), line("e", 500, "earrings")], [onlyNamed]).perUnit.map((d) => d > 0), [true, false]);
}

console.log(failures === 0 ? "\nAll engine checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
