/**
 * "Describe your offer": an admin writes an offer in their own words and
 * Claude fills in the editor for them to check.
 *
 * It only ever prepares a draft — nothing is saved or published from here —
 * and it is switched on by adding ANTHROPIC_API_KEY to the server's
 * environment. Without a key the box explains that and the gallery works as
 * before.
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { loadCatalogFacts } from "../read/catalog-facts";
import { loadSetLibrarySource } from "../piece-sets";
import { describedOfferSchema } from "./output-schema";
import type { DescribeVocabulary } from "./resolve-pieces";
import { toDescribedResult, type DescribedResult } from "./to-draft";

const MODEL = "claude-opus-5-5";
/** Enough names for Claude to match against; beyond this, pieces are chosen in the editor. */
const MAX_PRODUCT_NAMES = 500;

export class DescribeError extends Error {}

export function isDescribeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

const SYSTEM = `You turn a jewellery shop admin's description of an offer into the settings of the shop's offer editor.

The shop sells jewellery online (website) and at a counter in store (STORE). Prices are in Indian rupees.

Kinds of benefit:
- setPrice: any N of the pieces for a set price ("any 3 for ₹999").
- setPriceTiers: several set prices ("2 for ₹699, 3 for ₹999").
- bundle: one piece from each of two or more groups together for a price ("necklace + earrings for ₹1,499").
- reward: buy X, get Y free / at a % off / ₹ off / at a set price ("buy 2 get 1 free", "buy a necklace, earrings at 50%"). Use rewardPieces only when the rewarded pieces differ from those bought.
- percentOff, amountOffEach, fixedPriceEach: a reduction on each chosen piece.
- percentTiers: a bigger % off with more pieces (QUANTITY) or more spent on them (SUBTOTAL).
- amountOffOrder, percentOffOrder: off the whole order. orderTiers: steps by spend.
- freeDelivery: website orders only.

Pieces: describe them with the catalog names you are given. Categories, collections and named pieces are alternatives within a group; material, colour, size, price and markedDown narrow the group. Use one group per kind of piece, e.g. "earrings ₹200–400 or black necklaces under ₹600" is two groups. "Above ₹2,000" means minRupees 2000. Leave groups empty when the offer is on every piece.

Rules:
- Only use names that appear in the catalog lists. If the admin names something not in the lists, leave it out and say so in notes — never guess a near miss silently.
- Put every assumption in notes, in plain English the admin will read: defaults you chose, words you were unsure of, and anything you could not express (for example a free gift, tags, chosen clients, or card/bank offers).
- Channels are both ONLINE and STORE unless the text limits them.
- trigger is CODE only when the client must type a code.
- Dates are India time. Resolve words like "this weekend" or "till Diwali" from today's date; if a date is truly unclear leave it null and add a note.
- If the text is not an offer, set isOffer to false and explain in notes.`;

function catalogText(vocab: DescribeVocabulary): string {
  const list = (items: readonly string[]) => (items.length ? items.join("; ") : "(none)");
  const products = vocab.products.slice(0, MAX_PRODUCT_NAMES).map((p) => `${p.name} (₹${p.priceCents / 100})`);
  return [
    `Categories: ${list(vocab.categories.map((c) => c.name))}`,
    `Collections: ${list(vocab.collections.map((c) => c.name))}`,
    `Saved Piece Sets: ${list(vocab.savedSets.map((s) => s.name))}`,
    `Materials: ${list(vocab.materials)}`,
    `Colours: ${list(vocab.colors)}`,
    `Sizes: ${list(vocab.sizes)}`,
    `Pieces: ${list(products)}${vocab.products.length > MAX_PRODUCT_NAMES ? " (list shortened)" : ""}`,
  ].join("\n");
}

async function loadVocabulary(): Promise<DescribeVocabulary> {
  const [facts, sets] = await Promise.all([loadCatalogFacts(), loadSetLibrarySource()]);
  return {
    categories: facts.categories,
    collections: facts.collections,
    products: facts.products,
    savedSets: sets.stored.filter((s) => !s.archivedAt).map((s) => ({ id: s.id, name: s.name })),
    materials: facts.materials,
    colors: facts.colors,
    sizes: facts.sizes,
  };
}

function todayInIndia(): string {
  return new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "full", timeStyle: "short" });
}

export async function describeOffer(text: string): Promise<DescribedResult> {
  if (!isDescribeConfigured()) throw new DescribeError("Describing offers isn't switched on yet.");
  const vocab = await loadVocabulary();
  const client = new Anthropic();

  let response;
  try {
    response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium", format: betaZodOutputFormat(describedOfferSchema) },
      // If a safeguard declines, the request is retried on a fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Today is ${todayInIndia()} (India).\n\nThe shop's catalog:\n${catalogText(vocab)}\n\nThe admin's description:\n${text}`,
        },
      ],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) throw new DescribeError("The Claude API key was not accepted. Check ANTHROPIC_API_KEY.");
    if (error instanceof Anthropic.RateLimitError) throw new DescribeError("Too many requests just now — try again in a minute.");
    if (error instanceof Anthropic.APIConnectionError) throw new DescribeError("Couldn't reach Claude — check the connection and try again.");
    if (error instanceof Anthropic.APIError) throw new DescribeError("Claude couldn't read that just now — try again, or pick a kind of offer below.");
    throw error;
  }

  if (response.stop_reason === "refusal") throw new DescribeError("Claude declined to read that description. Try wording it differently.");
  if (response.stop_reason === "max_tokens") throw new DescribeError("That description was too long to read in one go — try a shorter one.");
  const offer = response.parsed_output;
  if (!offer) throw new DescribeError("Claude's answer couldn't be read — try again.");
  if (!offer.isOffer) {
    throw new DescribeError(offer.notes[0] ?? "That doesn't read like an offer. Try something like “Any 3 earrings for ₹999 this weekend”.");
  }
  return toDescribedResult(offer, vocab, text);
}
