import type { HelpEntry } from "./types";

const RELATED = [
  { label: "GST overview", href: "/admin/gst" },
  { label: "Classification", href: "/admin/gst/classification" },
  { label: "Rates & HSN", href: "/admin/gst/rates" },
];

/** Help for the GST screens. */
export const GST_HELP: HelpEntry[] = [
  {
    route: "/admin/gst",
    area: "GST",
    title: "GST overview",
    purpose:
      "Where GST stands: whether the engine is off, watching, or in force, and what is still missing before it can be switched on. Nothing is charged differently until you choose to enforce it.",
    steps: [
      "Read the checklist: each line says what is still needed (registration, classification, approved rates, a clean trial period).",
      "Leave the engine Off until the checklist is clear. Choose Shadow to have it work out GST on every order without changing what anyone pays.",
      "Choose Enforce only when every line is ticked — the screen refuses if something is missing, and says what.",
    ],
    sections: [
      {
        heading: "Modes",
        items: [
          { term: "Off", text: "Checkout, the counter and invoices work exactly as they always have." },
          { term: "Shadow", text: "GST is worked out and compared with what was charged, and the comparison is kept on the Calculations screen. Customers see no change." },
          { term: "Enforce", text: "GST is charged as worked out, split into CGST and SGST or IGST, and a GST tax invoice is kept. Pieces without a verified classification cannot be sold." },
        ],
      },
    ],
    notes: [
      "No rate is ever assumed. A piece with no verified classification is never given a default rate.",
      "The mode can be put back to Off at any time; earlier invoices and calculations are never changed.",
    ],
    related: RELATED,
  },
  {
    route: "/admin/gst/business",
    area: "GST",
    title: "GST registration and settings",
    purpose:
      "The shop's own GST registration — legal name, GSTIN, state and address — and the decisions the accountant must make, such as how delivery and cash-on-delivery charges are taxed.",
    steps: [
      "Enter the legal name, GSTIN and registered address exactly as on the registration certificate.",
      "Press Verify. The GSTIN is checked for format and checksum, and the state code must match its first two digits.",
      "Record each accountant decision under Settings; items left undecided keep the engine from being enforced.",
    ],
    sections: [
      {
        heading: "Settings",
        items: [
          { term: "Prices include GST", text: "Whether the price on a piece already contains GST (inclusive) or GST is added on top (exclusive)." },
          { term: "Delivery / cash-on-delivery charges", text: "None (no GST), follows the goods (taxed like what is bought), or separate (own HSN/SAC and rate). Left undecided until the accountant confirms." },
          { term: "Mixed baskets", text: "How a charge is shared when pieces carry different rates: in proportion, or at the highest rate." },
          { term: "E-invoicing", text: "Whether the shop must generate e-invoices. If it must, the engine cannot be enforced yet, because that is not built." },
        ],
      },
      {
        heading: "Supplier documents",
        items: [
          { term: "Supplier documents", text: "Purchase invoices and notes about what pieces are made of, kept as evidence for classification." },
        ],
      },
    ],
    notes: ["Nothing here is guessed or pre-filled. A GSTIN that fails its checksum is refused rather than saved as verified."],
    related: RELATED,
  },
  {
    route: "/admin/gst/classification",
    area: "GST",
    title: "GST classification",
    purpose:
      "Each piece's HSN heading and its status. A piece stays at Needs product information until what it is made of is entered and confirmed; headings are suggested from what you enter, never from a name or a price.",
    steps: [
      "Download the material sheet, fill in what each piece is made of (base metal, plating, stones, pearls) and upload it back — the preview shows what would be saved first.",
      "Or open a piece and enter its details there, with the supplier invoice that proves them.",
      "When the details are complete, send the piece for the accountant's approval, who approves or rejects it with a reason.",
    ],
    sections: [
      {
        heading: "Statuses",
        items: [
          { term: "Needs product information", text: "Details missing. The screen lists exactly what." },
          { term: "Needs accountant approval", text: "Details are complete; a heading is chosen and waits for a decision." },
          { term: "Verified", text: "Approved by a named person. Only verified pieces can be taxed when GST is enforced." },
          { term: "Rejected", text: "Sent back with the reason; change the details and send again." },
        ],
      },
      {
        heading: "Not yet in this catalog",
        items: [{ term: "On the live shop", text: "Pieces and categories seen on the live shop that are not in this catalog yet. Import them, then classify them like the rest." }],
      },
    ],
    notes: ["The person who enters a piece's details cannot approve the same piece."],
    related: RELATED,
  },
  {
    route: "/admin/gst/rates",
    area: "GST",
    title: "Rates, HSN codes and notifications",
    purpose:
      "The rate table GST is worked out from: HSN and SAC codes, the rate in force from each date, and the government notification each rate rests on. Old rates are kept, so an old invoice can always be explained.",
    steps: [
      "Add the notification (number, date, link) and mark it verified once you have read it.",
      "Add a rate as a draft against the code, with the date it takes effect.",
      "Approve it. Approval is refused unless the notification is verified, and an approved rate is never edited — a new version replaces it from a later date.",
    ],
    sections: [
      {
        heading: "Rates",
        items: [
          { term: "Total rate", text: "The full GST rate. CGST and SGST are each half of it within a state; IGST is all of it between states." },
          { term: "Draft / Approved", text: "Only approved rates are ever used to charge customers. Draft rates are for review." },
          { term: "In force from / until", text: "A rate applies to orders made within these dates. Two approved rates for the same code cannot overlap." },
        ],
      },
    ],
    notes: ["Rates listed as drafts came from public notifications and are not approved. Check each against the notification before approving."],
    related: RELATED,
  },
  {
    route: "/admin/gst/monitoring",
    area: "GST",
    title: "GST calculations",
    purpose:
      "What the engine worked out for each order, beside what the existing checkout charged. This is how a wrong classification or rate is found before anyone pays for it.",
    steps: [
      "Filter to Different from today to see orders where the engine and the current checkout disagree.",
      "Filter to Not classified to see pieces that held an order back for want of a verified heading.",
      "Aim for a run of orders that all match before enforcing.",
    ],
    sections: [
      {
        heading: "Outcomes",
        items: [
          { term: "Same as today", text: "The engine's tax equals what was charged." },
          { term: "Different", text: "The totals differ; the Difference column shows by how much." },
          { term: "Not classified", text: "A piece had no verified heading, so no tax could be worked out for it." },
          { term: "Error", text: "The calculation could not be completed; the reason is shown." },
        ],
      },
    ],
    related: RELATED,
  },
  {
    route: "/admin/gst/invoices",
    area: "GST",
    title: "GST invoices and credit notes",
    purpose:
      "GST tax invoices for orders priced by the engine, and the credit notes issued against them. Existing invoices are never changed.",
    steps: [
      "Open an invoice to see it as it prints.",
      "If an order was invoiced but has no GST details, press Fill in missing GST details to write them from the saved calculation.",
    ],
    notes: [
      "A red notice appears if a GST invoice value ever differs from the original invoice.",
      "Customers can download their own GST invoice from My Orders.",
    ],
    related: RELATED,
  },
  {
    route: "/admin/gst/invoices/[orderId]",
    area: "GST",
    title: "A GST invoice",
    purpose:
      "One GST tax invoice as it prints, with its credit notes and the form to issue another, whole or in part.",
    steps: [
      "Press Print or save as PDF; set margins to None and scale to 100 in the print dialog.",
      "For a refund, give the reason, then either enter an amount against each line for a part credit note, or credit the whole remaining invoice.",
    ],
    sections: [
      {
        heading: "Credit notes",
        items: [
          { term: "Amount per line", text: "The most you can refund on a line is what it was charged less what earlier credit notes returned. Tax is reversed at the rate the invoice used." },
          { term: "Charges without GST", text: "Delivery or cash-on-delivery charges that carried no GST can be refunded here too." },
        ],
      },
    ],
    notes: ["Credit notes share one number series with the existing ones. A credit note cannot be edited or deleted."],
    related: [{ label: "GST invoices", href: "/admin/gst/invoices" }],
  },
  {
    route: "/admin/gst/reports",
    area: "GST",
    title: "GST reports",
    purpose:
      "Monthly figures for whoever files the return: GSTR-1 tables, sales register, HSN-wise sales, tax liability, and a GSTR-3B comparison. Nothing here files a return or says one has been filed.",
    steps: [
      "Pick the month and the report; use CSV to take a table to Excel.",
      "For GSTR-3B, type the figures from the return and save the comparison; differences are listed by head.",
    ],
    notes: [
      "Only invoices issued with GST details appear. The screen says how many invoices this month were left out.",
      "Credit notes are subtracted from the month they were issued in.",
    ],
    related: RELATED,
  },
  {
    route: "/admin/gst/updates",
    area: "GST",
    title: "GST updates",
    purpose:
      "Keeping up with new notifications. Official pages can be watched for change, and a change someone spots is recorded, reviewed by a named person, and — if accepted — becomes a draft rate. Nothing is published automatically.",
    steps: [
      "Add an official page to watch; use Check now to see whether it has changed, then read it yourself.",
      "Record a proposed change with its source and the date it takes effect.",
      "Review it with your name. Accepting creates a draft rate on the Rates screen, still to be approved there.",
    ],
    notes: ["Only official government addresses (https) can be watched."],
    related: RELATED,
  },
];
