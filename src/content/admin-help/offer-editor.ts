import type { HelpEntry } from "./types";

/** Help for the one-page offer editor, new or existing. */
const EDITOR_SECTIONS: HelpEntry["sections"] = [
  {
    heading: "1 Offer",
    items: [
      { term: "Internal name", text: "For your team only. Clients see the Offer title instead." },
      { term: "Automatically / With a code", text: "Automatic offers apply whenever a cart qualifies. Code offers apply only when the client enters the code — online at checkout, or told to staff at the counter." },
      { term: "Code · Suggest", text: "One code everyone can use. Suggest makes a readable one. Capital letters don't matter to clients." },
      { term: "Where", text: "Online, In store, or both." },
      { term: "Unique codes (optional)", text: "A batch of codes, one per client, usually usable once — for VIPs. Generate, then Copy unused to send them. Available once the offer is saved." },
    ],
  },
  {
    heading: "2 Which pieces",
    items: [
      { term: "Every piece", text: "The offer can use any piece." },
      { term: "Sets, categories, collections", text: "Choose one or more; a piece counts if it is in any of them. New set of pieces builds one without leaving the offer." },
      { term: "Specific pieces", text: "Add pieces by name, alongside or instead of sets." },
      { term: "Except these pieces", text: "Pieces the offer never uses." },
      { term: "Leave out pieces already marked down", text: "Keeps pieces that already show a reduced price out, so nothing is reduced twice." },
      { term: "N pieces included", text: "How many sellable pieces the choice covers right now. Red at 0 — the offer would never apply." },
    ],
  },
  {
    heading: "3 What the client gets",
    items: [
      { term: "Any [3] of these pieces for [₹999]", text: "The price the client pays for the set — on the website and at the counter alike." },
      { term: "Apply as many times / once per order / up to…", text: "Whether 6 pieces make two sets, or only one." },
      { term: "Buy [2], get [1] at Free / % off / ₹ off / for ₹", text: "Buy X Get Y. The one they get is the lowest-priced (or highest-priced) piece, from the same pieces or others you choose." },
      { term: "Tiers", text: "Each row is a set size and its price; the price per piece is shown so you can see it falls as sets grow." },
      { term: "Pieces beyond the largest set", text: "Start another set, or pay full price." },
    ],
  },
  {
    heading: "4 When",
    items: [
      { term: "Starts / Ends", text: "Indian Standard Time. Leave Ends empty to run until you end it." },
      { term: "Repeats on a schedule", text: "Only on certain days or between certain hours, e.g. every evening 6–9 pm." },
    ],
  },
  {
    heading: "5 Who and how much",
    items: [
      { term: "Minimum matching pieces / Minimum spend", text: "The offer waits until the cart has this much of the chosen pieces." },
      { term: "Only on orders worth at least", text: "A minimum for the whole order." },
      { term: "Everyone · Signed-in clients · First order only · Chosen clients", text: "Who can have it. Chosen clients are picked by name, mobile or email; walk-ins without an account can't be matched." },
      { term: "Paid by", text: "Only when paying by UPI, Card, Cash or Cash on delivery. None chosen means any way." },
      { term: "Total uses · Uses per client", text: "How many orders can use it, overall and per client." },
      { term: "Most off one order", text: "A cap on the discount in one order." },
      { term: "Stop once this much has been given away", text: "A budget: the offer ends itself when it has given this much in total." },
    ],
  },
  {
    heading: "6 With other offers",
    items: [
      { term: "How offers share a cart", text: "Each piece goes to one piece offer, and the client gets whichever combination saves most — automatically." },
      { term: "Can be combined with other kinds of offer", text: "Lets a piece offer (e.g. Any 3 for ₹999) sit with an order offer or code (e.g. 10% off with FESTIVE10). Both offers must allow it." },
      { term: "Exclusive", text: "When this applies, nothing else does — even if another offer would save the client more." },
    ],
  },
  {
    heading: "7 What the client sees",
    items: [
      { term: "Offer title", text: "Shown in the cart and on the receipt. Left empty, it is written for you (e.g. “Any 3 for ₹999”)." },
      { term: "Badge on pieces", text: "A short label for the product card, e.g. “3 for ₹999”." },
      { term: "Nudge in the cart", text: "Shown when the client is close. {remaining} becomes “1 more piece” or “₹500 more”." },
      { term: "When it applies", text: "Shown on the applied offer. {saving} becomes the amount saved." },
      { term: "On the invoice", text: "The words printed beside the discount on the invoice." },
      { term: "Show in the storefront's offers", text: "Switch off for private codes you hand out yourself." },
    ],
  },
  {
    heading: "Summary and Test with a cart",
    items: [
      { term: "Summary", text: "The offer in plain words, with red problems that stop it going live and amber things worth knowing (could sell below cost, overlaps another offer, no end date)." },
      { term: "Test with a cart", text: "Add pieces (or Fill with matching pieces) and press Price this cart to see exactly what checkout or the counter would charge, piece by piece, with margin." },
      { term: "Include offers already live", text: "Test alongside the offers running now, to see which wins." },
      { term: "Test as if it were", text: "Price at a future date and time, to check a scheduled or evening-hours offer." },
    ],
  },
];

const EDITOR_NOTES = [
  "Save draft keeps it without going live. Save and activate is blocked while the Summary shows a red problem.",
  "A running offer can be edited; changes apply to new orders only.",
  "Clients are never charged more than checkout showed them: if an offer ends or runs out while they are paying, they are asked to review their total.",
  "Online payments count against an offer's limits once paid; cancelled and refunded orders give the use back.",
  "Offers the shop cannot build here yet: card and bank offers, a free gift added to the cart automatically, birthday or lifetime-spend rewards.",
];

export const OFFER_EDITOR_HELP: HelpEntry[] = [
  {
    route: "/admin/promotions/[id]",
    area: "Marketing & Content",
    title: "Offer",
    purpose: "Everything about one offer on one page — which pieces, what the client gets, when, who, and how it plays with other offers — with a plain-words summary and a test cart beside it.",
    steps: [
      "Work down the numbered cards; the Summary on the right updates as you go.",
      "Check the Summary has no red problems and read any amber notes.",
      "Price a sample cart in Test with a cart.",
      "Press Save and activate (or Save draft to finish later).",
    ],
    sections: EDITOR_SECTIONS,
    notes: EDITOR_NOTES,
    related: [
      { label: "Piece Sets", href: "/admin/promotions/sets" },
      { label: "All offers", href: "/admin/promotions" },
    ],
  },
];
