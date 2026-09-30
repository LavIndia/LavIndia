/**
 * Proves how "Describe your offer" turns Claude's reading into an editor
 * draft: names resolve to catalog ids, unknown names never widen an offer,
 * money and percentages convert exactly, and the result passes the same
 * validation a saved offer does. Pure — no database, no API call.
 *
 *   npx tsx scripts/verify-describe-offer.ts
 */
import { describedOfferSchema, type DescribedOffer } from "../src/modules/promotions/describe/output-schema";
import type { DescribeVocabulary } from "../src/modules/promotions/describe/resolve-pieces";
import { toDescribedResult } from "../src/modules/promotions/describe/to-draft";
import { promotionInputSchema } from "../src/modules/promotions/schema";
import { draftFromTemplate, toPayload, type Draft } from "../src/components/admin/promotions/promotion-draft";
import { templateById } from "../src/modules/promotions/templates";

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${ok ? "" : `\n        expected ${JSON.stringify(expected)}\n        actual   ${JSON.stringify(actual)}`}`);
}

const vocab: DescribeVocabulary = {
  categories: [{ id: "c-ear", name: "Earrings" }, { id: "c-neck", name: "Necklaces" }, { id: "c-bang", name: "Bangles" }],
  collections: [{ id: "k-fest", name: "Festive Edit" }],
  products: [{ id: "p-1", name: "Meera Jhumka", priceCents: 45_000 }, { id: "p-2", name: "Noor Choker", priceCents: 1_20_000 }],
  savedSets: [{ id: "s-1", name: "Wedding picks" }],
  materials: ["Brass", "Silver"],
  colors: ["Black", "Gold", "Red"],
  sizes: ["Free size"],
};

const noPieces = { savedSets: [], groups: [], except: [] };
const sel = (kind: DescribedOffer["pieces"]["groups"][number][number]["kind"], names: string[] = [], minRupees: number | null = null, maxRupees: number | null = null) =>
  ({ kind, names, minRupees, maxRupees });
const benefit = (over: Partial<DescribedOffer["benefit"]>): DescribedOffer["benefit"] => ({
  type: "percentOff", percent: null, rupees: null, setSize: null, buyQuantity: null, getQuantity: null,
  rewardKind: null, rewardAmount: null, rewardPieces: null, pick: null, tierBasis: null, tiers: null,
  leftovers: null, components: null, ...over,
});
function offer(over: Partial<DescribedOffer>): DescribedOffer {
  return describedOfferSchema.parse({
    isOffer: true, name: "Test", trigger: "AUTOMATIC", code: null, channels: ["ONLINE", "STORE"],
    pieces: noPieces, benefit: benefit({ percent: 10 }), minOrderRupees: null, minPieces: null,
    signedInOnly: false, firstOrderOnly: false, paymentMethods: [], startsAt: null, endsAt: null,
    recurrence: null, maxTimesPerOrder: null, perClientLimit: null, totalUses: null,
    maxDiscountRupees: null, budgetRupees: null, exclusive: false, badge: null, notes: [], ...over,
  });
}
function draftOf(o: DescribedOffer) {
  const result = toDescribedResult(o, vocab, "test");
  const draft = { ...draftFromTemplate(templateById(result.template)!), ...result.patch } as Draft;
  const valid = promotionInputSchema.safeParse(toPayload(draft)).success;
  return { result, draft, valid };
}

// 1. Any 3 earrings for ₹999 — plural/singular and case don't matter.
{
  const { result, draft, valid } = draftOf(offer({
    pieces: { savedSets: [], groups: [[sel("category", ["earring"])]], except: [] },
    benefit: benefit({ type: "setPrice", setSize: 3, rupees: 999 }),
  }));
  check("3 for ₹999: template", result.template, "ANY_N_FOR_X");
  check("3 for ₹999: benefit in paise", draft.benefit, { type: "setPrice", setSize: 3, priceCents: 99_900 });
  check("3 for ₹999: earrings as the category's set", draft.pieces, { include: [], exclude: [], setIds: ["category:c-ear"] });
  check("3 for ₹999: no new set needed", result.proposedSets.length, 0);
  check("3 for ₹999: valid", valid, true);
}

// 2. Above ₹2,000, buy 4 get 1 free.
{
  const { result, draft, valid } = draftOf(offer({
    pieces: { savedSets: [], groups: [[sel("price", [], 2000, null)]], except: [] },
    benefit: benefit({ type: "reward", buyQuantity: 4, getQuantity: 1, rewardKind: "free" }),
  }));
  check("buy 4 get 1: template", result.template, "BUY_X_GET_Y");
  check("buy 4 get 1: price floor becomes a proposed set", draft.pieces.setIds, ["proposed:1"]);
  check("buy 4 get 1: proposed set rows", result.proposedSets.map((p) => [p.name, p.rules]), [["₹2,000 and above", [{ field: "price", op: "over", minCents: 2_00_000 }]]]);
  check("buy 4 get 1: reward free", draft.benefit, { type: "reward", buyQuantity: 4, getQuantity: 1, gets: null, value: { type: "percent", bps: 10_000 }, pick: "CHEAPEST" });
  check("buy 4 get 1: valid", valid, true);
}

// 3. Earrings ₹200–400 or black necklaces under ₹600 — two groups.
{
  const { result, draft, valid } = draftOf(offer({
    pieces: {
      savedSets: [],
      groups: [
        [sel("category", ["Earrings"]), sel("price", [], 200, 400)],
        [sel("category", ["Necklaces"]), sel("colour", ["black"]), sel("price", [], null, 600)],
      ],
      except: [],
    },
    benefit: benefit({ percent: 20 }),
  }));
  check("two groups: two proposed sets", draft.pieces.setIds, ["proposed:1", "proposed:2"]);
  check("two groups: first set", result.proposedSets[0]?.rules, [{ field: "category", op: "is", values: ["c-ear"] }, { field: "price", op: "between", minCents: 20_000, maxCents: 40_000 }]);
  check("two groups: second set", result.proposedSets[1]?.rules, [{ field: "category", op: "is", values: ["c-neck"] }, { field: "colour", op: "is", values: ["Black"] }, { field: "price", op: "under", maxCents: 60_000 }]);
  check("two groups: set names", result.proposedSets.map((p) => p.name), ["Earrings · ₹200–₹400", "Necklaces · Black · up to ₹600"]);
  check("two groups: admin told to create them", result.notes[0]?.includes("2 new Piece Sets"), true);
  check("two groups: 20% in bps", draft.benefit, { type: "percentOff", bps: 2_000 });
  check("two groups: valid", valid, true);
}

// 4. An unknown colour drops its whole group rather than widening it.
{
  const { result, draft } = draftOf(offer({
    pieces: {
      savedSets: [],
      groups: [[sel("category", ["Earrings"])], [sel("category", ["Necklaces"]), sel("colour", ["Purple"])]],
      except: [],
    },
  }));
  check("unknown colour: group dropped", draft.pieces, { include: [], exclude: [], setIds: ["category:c-ear"] });
  check("unknown colour: noted", result.notes.some((n) => n.includes("Purple")), true);
}

// 5. Nothing matched → flagged loudly, not silently "every piece".
{
  const { result } = draftOf(offer({ pieces: { savedSets: [], groups: [[sel("category", ["Anklets"])]], except: [] } }));
  check("nothing matched: first note warns", result.notes[0]?.startsWith("None of the pieces described"), true);
}

// 6. Same-kind values in one group are "or", not "and".
{
  const { result } = draftOf(offer({ pieces: { savedSets: [], groups: [[sel("material", ["Brass"]), sel("material", ["silver"])]], except: [] } }));
  check("materials merged", result.proposedSets[0]?.rules, [{ field: "material", op: "is", values: ["Brass", "Silver"] }]);
}

// 7. A coupon code, first order, minimum spend.
{
  const { result, draft, valid } = draftOf(offer({
    trigger: "CODE", code: "welcome 10!", firstOrderOnly: true, minOrderRupees: 1500,
    benefit: benefit({ type: "percentOffOrder", percent: 10 }),
  }));
  check("coupon: template", result.template, "FIRST_ORDER");
  check("coupon: code cleaned", draft.code, "WELCOME10");
  check("coupon: minimum", draft.minSubtotalCents, 1_50_000);
  check("coupon: condition", draft.conditions, [{ type: "firstOrderOnly" }]);
  check("coupon: valid", valid, true);
}

// 8. Free delivery is website only; dates pass through; a bad date is noted.
{
  const { draft, result } = draftOf(offer({ benefit: benefit({ type: "freeDelivery" }), startsAt: "2026-10-03T00:00", endsAt: "Sunday" }));
  check("free delivery: online only", draft.channels, ["ONLINE"]);
  check("free delivery: start kept", draft.startsAt, "2026-10-03T00:00");
  check("free delivery: bad end left empty", draft.endsAt, "");
  check("free delivery: bad end noted", result.notes.some((n) => n.includes("Sunday")), true);
}

// 9. Buy a necklace, earrings at 50%; a named piece; a saved set.
{
  const { result, draft, valid } = draftOf(offer({
    pieces: { savedSets: ["wedding picks"], groups: [[sel("product", ["Noor Choker"])]], except: [] },
    benefit: benefit({
      type: "reward", buyQuantity: 1, getQuantity: 1, rewardKind: "percentOff", rewardAmount: 50,
      rewardPieces: { savedSets: [], groups: [[sel("category", ["Earrings"])]], except: [] },
    }),
  }));
  check("buy this get that: template", result.template, "BUY_THIS_GET_THAT");
  check("buy this get that: set and piece", draft.pieces, { include: [{ type: "products", ids: ["p-2"] }], exclude: [], setIds: ["s-1"] });
  check("buy this get that: reward from earrings", draft.benefit.type === "reward" && draft.benefit.gets?.setIds, ["category:c-ear"]);
  check("buy this get that: valid", valid, true);
}

// 10. Exceptions: "every piece except silver, and not already reduced".
{
  const { result, draft } = draftOf(offer({ pieces: { savedSets: [], groups: [], except: [sel("material", ["Silver"]), sel("markedDown"), sel("product", ["Meera Jhumka"])] } }));
  check("except: pieces left out by name and markdown", draft.pieces.exclude, [{ type: "products", ids: ["p-1"] }, { type: "markedDown" }]);
  check("except: not silver as a set", result.proposedSets[0]?.rules, [{ field: "material", op: "isNot", values: ["Silver"] }]);
}

// 11. Same rules proposed twice share one set.
{
  const same = { savedSets: [], groups: [[sel("colour", ["Red"])]], except: [] };
  const { result } = draftOf(offer({ pieces: same, benefit: benefit({ type: "reward", buyQuantity: 1, getQuantity: 1, rewardKind: "free", rewardPieces: same }) }));
  check("shared proposal", result.proposedSets.length, 1);
}

// 12. Tiers and a bundle.
{
  const tiers = draftOf(offer({ benefit: benefit({ type: "setPriceTiers", tiers: [{ threshold: 2, percent: null, rupees: 699 }, { threshold: 3, percent: null, rupees: 999 }] }) }));
  check("set tiers", tiers.draft.benefit, { type: "setPriceTiers", tiers: [{ size: 2, priceCents: 69_900 }, { size: 3, priceCents: 99_900 }], leftovers: "NEW_SET" });
  const bundle = draftOf(offer({
    benefit: benefit({
      type: "bundle", rupees: 1499,
      components: [
        { pieces: { savedSets: [], groups: [[sel("category", ["Necklaces"])]], except: [] }, quantity: 1 },
        { pieces: { savedSets: [], groups: [[sel("category", ["Earrings"])]], except: [] }, quantity: 1 },
      ],
    }),
  }));
  check("bundle: template", bundle.result.template, "BUNDLE");
  check("bundle: valid", bundle.valid, true);
}

console.log(failures ? `\n${failures} failed` : "\nAll passed");
process.exit(failures ? 1 : 0);
