import type { HelpEntry } from "./types";
import { OFFER_EDITOR_HELP } from "./offer-editor";

/** Help for Offers and Piece Sets (Marketing & Content). */
export const OFFERS_HELP: HelpEntry[] = [
  {
    route: "/admin/promotions",
    area: "Marketing & Content",
    title: "Offers",
    purpose:
      "Every offer the shop runs — set prices, Buy X Get Y, bundles, tiers, % or ₹ off, spend offers, coupon codes and free delivery. Offers apply the same way on the website and at the counter.",
    steps: [
      "Press New offer and pick the kind of offer closest to what you want.",
      "Fill in the offer page, check the Summary and try it with Test with a cart.",
      "Press Save and activate. It goes live at its start time.",
      "Come back here to pause, end, duplicate or archive it.",
    ],
    sections: [
      {
        heading: "The list",
        items: [
          { term: "Live · Scheduled · Paused · Drafts · Ended · Archived", text: "Tabs by status. The status is worked out from the offer's dates, pause and limits, so it is always current." },
          { term: "Offer title and code", text: "What clients see. A code shows beside offers that need one; “25 codes” means unique codes were generated." },
          { term: "Orders / given", text: "How many orders used the offer and how much it has taken off in total. Cancelled and refunded orders are not counted." },
          { term: "… menu", text: "Edit, Activate, Pause, Resume, End now, Archive, Restore, Duplicate, and Delete (only for an offer never used)." },
        ],
      },
      {
        heading: "Statuses",
        items: [
          { term: "Draft", text: "Saved but never activated. Clients never see it." },
          { term: "Scheduled", text: "Activated, waiting for its start time." },
          { term: "Live", text: "Applying now — within its hours if it repeats on a schedule." },
          { term: "Paused", text: "Stopped by you; Resume turns it back on with the same settings." },
          { term: "Ended", text: "Past its end date, or its total uses or budget are used up." },
          { term: "Archived", text: "Put away. Kept for reports; Restore brings it back." },
        ],
      },
    ],
    notes: [
      "An offer that has been used on an order can't be deleted, only archived — invoices and reports refer to it.",
      "Changes apply to new orders only. Orders already placed keep the prices they were charged.",
      "After a change it can take up to a minute for the website to show it.",
      "Old coupons were carried over as offers with a code; the Discounts screen now opens here.",
    ],
    related: [
      { label: "Piece Sets", href: "/admin/promotions/sets" },
      { label: "Delivery charges and GST", href: "/admin/settings" },
    ],
  },
  {
    route: "/admin/promotions/new",
    area: "Marketing & Content",
    title: "New offer — describe it or choose a kind",
    purpose: "Describe the offer in your own words and have it filled in for you, or pick the kind of offer closest to what you have in mind. Either way, everything about it — pieces, prices, dates, who gets it — can be changed on the next page.",
    steps: [
      "Write the offer in the “Describe your offer” box, e.g. “Any 3 earrings for ₹999 this weekend”, or tap one of the examples.",
      "Press Fill in the offer. The offer editor opens with the settings filled in and a gold box of notes on top.",
      "Read the notes, then check every step — especially Which pieces and the piece count under it — and test it with a cart.",
      "Save draft or Save and activate, as with any offer.",
    ],
    sections: [
      {
        heading: "Describe your offer",
        items: [
          { term: "What to write", text: "The pieces, what the client gets, and when — the way you would tell a colleague. Names of categories, collections, materials, colours and pieces are matched to your catalog; price limits (“above ₹2,000”, “between ₹200 and ₹400”) and several groups (“earrings under ₹400 or black necklaces under ₹600”) are understood." },
          { term: "The notes", text: "Every assumption made and anything that couldn't be filled in: a name not in your catalog, a date that wasn't clear, or things it can't set up (free gifts, tags, chosen clients, card or bank offers). A name that isn't in your catalog is always left out — never swapped for a near miss — and if that would make the offer cover more pieces than you described, the whole group is left out for you to choose." },
          { term: "Suggested Piece Sets", text: "Pieces a category, collection or name can't cover on its own — “black necklaces under ₹600” — are suggested as a new Piece Set, marked “Not created yet” under Which pieces. Press Create set, check the pieces, and save it. Until then the offer covers none of those pieces and can't be activated." },
          { term: "Nothing is saved", text: "It only fills in the editor. The offer is saved or goes live only when you press Save draft or Save and activate there." },
          { term: "“Not switched on yet”", text: "The box needs a Claude API key (ANTHROPIC_API_KEY) in the server settings. Until it is added, choose a kind of offer below instead." },
        ],
      },
      {
        heading: "Kinds of offer",
        items: [
          { term: "Any 3 for ₹999", text: "A set price for any N of the chosen pieces. The client always gets the dearest pieces into the set." },
          { term: "More you buy, less you pay", text: "Tiers of set prices, e.g. 2 for ₹699, 3 for ₹999, 4 for ₹1,299. The client is charged the combination that costs them least." },
          { term: "Necklace + Earrings for ₹1,499", text: "A price for one piece from each of two or more groups together." },
          { term: "Buy 1 Get 1 / Buy 2 Get 1", text: "The lowest-priced piece is free (or a % off, or a set price)." },
          { term: "Buy a necklace, earrings at 50%", text: "Buy from some pieces, get a reward from different pieces." },
          { term: "% off · ₹ off every piece · Everything at ₹499", text: "A reduction on each chosen piece." },
          { term: "Buy more, save more", text: "A bigger % off the more pieces (or the more spent)." },
          { term: "Spend ₹5,000, get ₹500 off · Spend more, save more", text: "Money off the whole order above a spend, or in steps." },
          { term: "Coupon code", text: "% or ₹ off the order when the client enters a code." },
          { term: "Free delivery", text: "Delivery free, optionally above a spend." },
          { term: "Welcome offer · Evening hours", text: "For a client's first order; or only at set times of day." },
        ],
      },
    ],
  },
  {
    route: "/admin/promotions/sets",
    area: "Marketing & Content",
    title: "Piece Sets",
    purpose:
      "Named groups of pieces — “Festive earrings”, “Necklaces under ₹600” — built once and used by any offer. Every category and collection already works as a set without creating one.",
    steps: ["Press New set.", "Add rows that describe the pieces; watch the count and pictures update.", "Save, then choose the set inside any offer."],
    sections: [
      {
        heading: "The list",
        items: [
          { term: "Rows in words", text: "What the set holds, e.g. “Category is Earrings · Price up to ₹600”." },
          { term: "Used by N offers", text: "Green when a running offer uses the set. Editing it changes those offers straight away." },
        ],
      },
    ],
    notes: ["A set used by an offer can't be deleted — change the offer first."],
    related: [{ label: "Offers", href: "/admin/promotions" }],
  },
  {
    route: "/admin/promotions/sets/[id]",
    area: "Marketing & Content",
    title: "Piece Set",
    purpose: "Describe a group of pieces with simple rows. The pieces that match are shown as you type.",
    steps: [
      "Give the set a name clients never see, e.g. “Festive earrings”.",
      "Choose whether pieces must match all of the rows or any of them.",
      "Add rows with the buttons (Category, Tag, Price…), and pick values.",
      "Add pieces to Always include or Never include if needed.",
      "Check the count and pictures, then Create set / Save set.",
    ],
    sections: [
      {
        heading: "Rows",
        items: [
          { term: "all of these / any of these", text: "All: a piece must meet every row (Earrings AND under ₹600). Any: one row is enough (Earrings OR Rings)." },
          { term: "Category · Collection · Piece", text: "Where pieces come from. “is not” leaves them out." },
          { term: "Tag", text: "Your own labels on products (e.g. festive edit). Tag pieces on the product page, or several at once from Products → select → Tags." },
          { term: "Price", text: "is under, is over or is between — the piece's catalog price." },
          { term: "Colour · Material · Size", text: "Only shown once pieces have these filled in on the product." },
          { term: "Marked down", text: "Pieces showing a crossed-out higher price. Use “no” to keep reduced pieces out." },
          { term: "New arrival", text: "Added to the catalog in the last N days — pieces leave the set by themselves as they age." },
          { term: "Featured · Limited edition", text: "The switches of the same name on the product." },
          { term: "Always include / Never include", text: "Named pieces that are always in, or never in, whatever the rows say." },
        ],
      },
      {
        heading: "The count",
        items: [
          { term: "N pieces in this set", text: "Pieces that match now. Pieces not on sale online (drafts, retired) still count at the counter and are pointed out." },
        ],
      },
    ],
    notes: [
      "Sets are live: a piece you tag, add or re-price later joins or leaves the set, and every offer using it, on its own.",
      "Rows left without a value are ignored when you save.",
    ],
  },
  ...OFFER_EDITOR_HELP,
];
