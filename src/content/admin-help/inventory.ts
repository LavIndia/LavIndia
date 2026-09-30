import type { HelpEntry } from "./types";

/** Help for the inventory screens. */
export const INVENTORY_HELP: HelpEntry[] = [
  {
    route: "/admin/inventory/stock",
    area: "Inventory",
    title: "Stock",
    purpose:
      "How many of each piece you hold right now, and how many can still be sold. The website and the counter sell from this same stock.",
    steps: [
      "Type a piece's name or SKU in the search box, or scan its barcode, to find its line.",
      "Check Available — this is what can be sold today, online or in the shop.",
      "If the shelf does not match On hand, click the On hand number, type the Actual count on the shelf, and tap the reason.",
      "Click the Low stock or Out of stock card to see which pieces need reordering, then book deliveries in with Receive Stock.",
    ],
    sections: [
      {
        heading: "Headline cards",
        items: [
          { term: "Units on hand", text: "Every physical piece you hold, added up across all pieces. The only card that counts pieces; the other three count SKUs, so do not add them together." },
          { term: "SKU", text: "One sellable option. A necklace offered in three sizes is three SKUs." },
          { term: "In stock", text: "SKUs with more available than their reorder point, plus retired pieces that still have stock." },
          { term: "Low stock", text: "SKUs still for sale but at or below their reorder point — 3 unless a different point has been set for that option. Worth reordering. Click the card to list them." },
          { term: "Out of stock", text: "SKUs with nothing available. They stay visible on the website but cannot be bought until you receive more. Click the card to list them." },
        ],
      },
      {
        heading: "Filters",
        items: [
          { term: "Search product, SKU or scan a barcode", text: "Matches piece names, option names and SKUs as you type. A barcode must be complete — scanning one jumps straight to its line." },
          { term: "All stock / In stock / Low stock / Out of stock", text: "Shows only lines in that state." },
          { term: "Location", text: "Appears only when the shop has more than one stock location. With one location there is nothing to choose." },
        ],
      },
      {
        heading: "The table",
        items: [
          { term: "Product", text: "The piece, with its Colour or Size option underneath when it has one. Click the name to open the piece in Products. “Retired · not restocked” marks a piece you have stopped buying." },
          { term: "SKU / Barcode", text: "The piece's stock code and its printed barcode." },
          { term: "Location", text: "Where this stock is held." },
          { term: "Price", text: "The selling price of this option (or of the piece, if the option has no price of its own)." },
          { term: "On hand", text: "Every piece physically there, including any promised to an online order not yet paid. This is the number a shelf count should match. Click it to correct it." },
          { term: "Committed", text: "Held for an online client whose payment is still going through. Blank when nothing is held." },
          { term: "Available", text: "On hand minus Committed — what can be sold right now. This is the figure the website shows." },
          { term: "Status", text: "Worked out from Available, never set by hand: none is Out of stock; at or below the option's reorder point is Low stock. A retired piece is never shown as Low stock." },
        ],
      },
      {
        heading: "Correcting a count",
        items: [
          { term: "Actual count on the shelf", text: "Type what you really have, not the difference. The change and the old figure (“+2 · was 3”) show underneath." },
          { term: "Why?", text: "Tap the reason to save. Going up: Stocktake correction or Found. Going down: Stocktake correction, Damaged, Lost or stolen, Returned to supplier, or Gifted or sampled." },
          { term: "Matches the system. Nothing to change.", text: "The number you typed is already correct, so nothing is saved." },
        ],
      },
    ],
    notes: [
      "Stock is kept here in Inventory, not on the piece itself. A piece with a single option can also have its count set from the Products list; that is recorded as an adjustment too.",
      "Every change — deliveries, sales, online holds, corrections — is written to Movements with who made it and why, and can never be edited or deleted.",
      "Committed stock is released automatically if the client's payment fails or the checkout is abandoned for 30 minutes.",
      "You cannot count a line below what is Committed to online orders; the save is refused.",
      "Damaged is recorded separately from other write-downs, so losses to damage can be totalled.",
      "When a retired piece reaches zero on hand across all its options, it is taken off the website automatically.",
      "On a phone the list shows Available only. Correct counts from a computer or tablet, or use Adjustments.",
      "The website is updated as soon as a change is saved.",
    ],
    related: [
      { label: "Receive Stock", href: "/admin/inventory/receive" },
      { label: "Adjustments", href: "/admin/inventory/adjustments" },
      { label: "Movements", href: "/admin/inventory/movements" },
      { label: "Products", href: "/admin/products" },
    ],
  },
  {
    route: "/admin/inventory/receive",
    area: "Inventory",
    title: "Receive Stock",
    purpose:
      "Book a delivery from a workshop or wholesaler into stock, with what you paid for it. Receiving always adds to what you already hold.",
    steps: [
      "Scan each piece's barcode, or type its name or SKU in Add items and pick it from the list. Scanning the same piece again adds one more.",
      "Check the quantity on each line; the line shows the stock now and what it “becomes”.",
      "Enter the prices from the bill if you have them: Asking price, After bargain and Your cost.",
      "Choose the Supplier and add the Invoice number and Invoice date if you have them.",
      "Press Receive stock.",
    ],
    sections: [
      {
        heading: "Finding pieces",
        items: [
          { term: "Add items", text: "Scan a barcode with a scanner, or type a name or SKU and choose from the list. The list shows each option's SKU, price and how many are available." },
          { term: "Scan with camera", text: "The camera button beside the box. Use it on a phone or tablet with no scanner attached." },
          { term: "Barcode not found", text: "No piece carries that code. Search by name or SKU instead. A new piece must be added in Products first — receiving never creates one." },
        ],
      },
      {
        heading: "Each line",
        items: [
          { term: "In stock / becomes", text: "How many are available now, and how many there will be after this delivery." },
          { term: "Quantity", text: "How many arrived. Whole numbers of one or more." },
          { term: "✕", text: "Removes the line from this delivery." },
          { term: "Prices are", text: "Per unit if the bill gives a price for one piece; Total if it gives one figure for the whole line. A total is divided by the quantity for you." },
          { term: "Asking price", text: "What the supplier first asked. Optional." },
          { term: "After bargain", text: "The price agreed after bargaining. Optional." },
          { term: "Your cost", text: "What the piece really costs you, including any making or freight charges. This is the figure your margins are worked from. If left empty, the After bargain price is used, then the Asking price." },
          { term: "Saved / over the asking price", text: "Appears when an Asking price is entered: how much bargaining saved, or how much you paid above it." },
        ],
      },
      {
        heading: "About the delivery",
        items: [
          { term: "Supplier (optional)", text: "Who it came from. Choosing one is what lets Accounting total your spend with each supplier. “Not recorded” leaves it blank. Manage suppliers opens the Suppliers screen." },
          { term: "Invoice number (optional)", text: "As printed on the supplier's bill." },
          { term: "Invoice date (optional)", text: "The date on the bill." },
          { term: "Note (optional)", text: "A delivery note or supplier reference. Shown in Movements." },
          { term: "Totals", text: "Items, units and the delivery's cost, with the total saved by bargaining when known." },
          { term: "Clear", text: "Empties the list without saving anything." },
          { term: "Receive stock", text: "Books everything on the list in, in one go." },
        ],
      },
    ],
    notes: [
      "Receiving adds to the count already on the shelf; it never replaces it. To set a count, use Adjustments or click the number on the Stock screen.",
      "The whole delivery is saved together — if any line fails, nothing is booked in.",
      "Retired pieces cannot be received. The save is refused and names the piece.",
      "Pressing Receive stock twice by accident does not book the delivery twice.",
      "Stock goes into the shop's default location, named at the top of the screen.",
      "Every line appears in Movements as Received, with who booked it in and when. It cannot be undone — correct a mistake with a Count down adjustment.",
      "The website shows the new stock as soon as you save.",
    ],
    related: [
      { label: "Stock", href: "/admin/inventory/stock" },
      { label: "Suppliers", href: "/admin/suppliers" },
      { label: "Movements", href: "/admin/inventory/movements" },
      { label: "Accounting", href: "/admin/accounting" },
      { label: "Barcodes", href: "/admin/inventory/barcodes" },
    ],
  },
  {
    route: "/admin/inventory/adjustments",
    area: "Inventory",
    title: "Adjustments",
    purpose:
      "Correct stock when it changed for a reason that is not a sale or a delivery — a stocktake, a damaged piece, something lost. Use it for several pieces at once.",
    steps: [
      "Choose the Adjustment: Count up, Count down or Damage / write-off.",
      "Scan or search for each piece in Add items, and set how many to add or remove on each line.",
      "Write the Reason — say what happened, not just “correction”.",
      "Press Apply adjustment.",
    ],
    sections: [
      {
        heading: "The form",
        items: [
          { term: "Count up", text: "A stocktake found more than the system expected." },
          { term: "Count down", text: "A stocktake found fewer — miscounted, misplaced or lost." },
          { term: "Damage / write-off", text: "Pieces that can no longer be sold. Kept separate so losses can be totalled." },
          { term: "Add items", text: "Scan a barcode, use Scan with camera, or search by name or SKU. Adding the same piece again raises its quantity by one." },
          { term: "In stock / becomes", text: "Available now and after this adjustment. “Not enough stock” means you are removing more than is available." },
          { term: "Quantity", text: "How many to add or remove — not the new total." },
          { term: "Reason (required)", text: "Saved permanently in Movements. Write it for someone reading it a year from now." },
          { term: "Clear", text: "Empties the list without saving." },
          { term: "Apply adjustment", text: "Saves every line. Stays greyed out until at least one piece and a reason are entered." },
          { term: "Movement History", text: "Opens Movements." },
        ],
      },
    ],
    notes: [
      "One adjustment type and one reason cover every line. For a mix (some found, some damaged), make separate adjustments.",
      "Deliveries belong in Receive Stock. Counter sales and online orders change stock by themselves.",
      "You cannot remove more than is available; pieces held for an online payment in progress are protected. If any line fails, nothing is saved.",
      "Adjustments are permanent and appear in Movements against your name. A mistake is fixed with another adjustment the other way.",
      "Retired pieces can still be corrected here. When one reaches zero on hand, it is taken off the website automatically.",
      "For a single piece, clicking its On hand number on the Stock screen is quicker.",
    ],
    related: [
      { label: "Stock", href: "/admin/inventory/stock" },
      { label: "Movements", href: "/admin/inventory/movements" },
      { label: "Receive Stock", href: "/admin/inventory/receive" },
    ],
  },
  {
    route: "/admin/inventory/movements",
    area: "Inventory",
    title: "Movements",
    purpose:
      "The permanent record of every change to stock, newest first — deliveries, sales, returns, corrections and online holds. Use it to answer “where did this piece go?”",
    steps: [
      "Type a piece's name, a SKU or barcode, or an order number in the search box.",
      "Narrow it with the movement type if needed.",
      "Read the Before → After and Reason columns to see exactly what happened.",
    ],
    sections: [
      {
        heading: "Filters",
        items: [
          { term: "Search product, SKU, barcode or order number", text: "Piece names and order numbers match in part; a SKU or barcode must be typed in full." },
          { term: "All movements", text: "Or pick one type: Received, Sold, Returned, Counted up, Counted down, Damaged, Committed or Released." },
        ],
      },
      {
        heading: "Movement types",
        items: [
          { term: "Received", text: "Booked in through Receive Stock." },
          { term: "Sold", text: "Sold at the counter or online." },
          { term: "Returned", text: "A piece from an order put back into stock." },
          { term: "Counted up / Counted down", text: "A correction from Adjustments, the Stock screen or the Products list." },
          { term: "Damaged", text: "Written off as damaged." },
          { term: "Committed", text: "Held for an online client while their payment goes through. The piece is still on the shelf." },
          { term: "Released", text: "A hold let go because payment failed or the checkout was abandoned." },
        ],
      },
      {
        heading: "Columns",
        items: [
          { term: "When", text: "Date and time of the change." },
          { term: "Item", text: "The piece, with its option and SKU." },
          { term: "Change", text: "How many were added (green) or taken away (red)." },
          { term: "Before → After", text: "The on-hand count just before and just after. For Committed and Released these stay the same, because a hold does not move the piece." },
          { term: "Reason / Reference", text: "The reason given, and the order number when the change came from an order." },
          { term: "By", text: "Who made the change. “system” means it happened automatically, such as a hold being released." },
        ],
      },
    ],
    notes: [
      "Entries are never edited or deleted — there is no button that could. A mistake is corrected with a further adjustment, so the correction shows too.",
      "Replaying every entry in order gives today's stock exactly, which is what makes the Stock screen's figures trustworthy.",
      "Entries for a piece that was later deleted from Products stay here under its old name.",
      "50 entries are shown per page.",
    ],
    related: [
      { label: "Stock", href: "/admin/inventory/stock" },
      { label: "Adjustments", href: "/admin/inventory/adjustments" },
      { label: "Orders", href: "/admin/orders" },
      { label: "Audit Logs", href: "/admin/audit-logs" },
    ],
  },
  {
    route: "/admin/inventory/barcodes",
    area: "Inventory",
    title: "Barcodes",
    purpose:
      "Print barcode labels for any piece, on A4 label sheets or a thermal label roll. Every option already has its barcode; this screen only prints it.",
    steps: [
      "Choose the Label format that matches the labels you have.",
      "Scan or search for each piece in Add items, and set how many labels you need for each.",
      "Check the Actual size sample and the Preview. Adjust the Layout if anything is clipped.",
      "Press Print, and print at 100% scale.",
    ],
    sections: [
      {
        heading: "Choosing what to print",
        items: [
          { term: "Label format", text: "A4 sheets of 21, 24, 40 or 65 labels (matching Avery L7160, L7159, L7654 and L7651), or a 50 × 25 mm or 38 × 19 mm roll for a thermal printer. The 38 × 19 mm roll suits small jewellery tags. Starts on A4 sheet · 24 labels." },
          { term: "Add items", text: "Scan a barcode, use Scan with camera, or search by name or SKU. Adding the same piece again adds one more label." },
          { term: "Number of labels", text: "The box beside each chosen piece. ✕ removes it." },
          { term: "Print", text: "Shows how many labels will print and opens your browser's print window." },
        ],
      },
      {
        heading: "Checking the label",
        items: [
          { term: "Actual size", text: "One label at its true size. Hold a label sheet against the screen to check before printing. Says “sample” until you choose a piece." },
          { term: "Barcode height / Narrow bar / Per sheet", text: "The label's measurements. A narrow bar marked “(minimum)” is at the smallest width most handheld scanners read reliably." },
          { term: "Preview", text: "The full sheet or roll exactly as it will print, with the number of labels and sheets." },
        ],
      },
      {
        heading: "Layout",
        items: [
          { term: "Brand · Product name · Variant · Barcode · SKU and price", text: "The rows on the label. Drag a row to change the order; use its switch to hide it. The barcode cannot be hidden. The option name is left off pieces with no Colour or Size." },
          { term: "SKU / Price", text: "Switches under SKU and price, to show either on its own." },
          { term: "Text size", text: "Makes all text larger or smaller, from 75% to 140%." },
          { term: "Barcode height", text: "Set automatically to fit the label. Move it to choose your own; Back to automatic undoes that." },
          { term: "Reset", text: "Returns the layout to how it started for this format." },
        ],
      },
    ],
    notes: [
      "These are LavIndia's own Code 128 barcodes. They are not registered retail (EAN or GTIN) numbers, so they only work within LavIndia's own screens — the counter, stock screens and here.",
      "A piece with no barcode cannot be added to the print list.",
      "The price printed is the option's current selling price.",
      "Layout settings are remembered for each label format, on this computer only.",
      "If a warning says more is switched on than fits, reduce the text size, shorten the barcode or switch a row off — otherwise the bottom of the label is cut off.",
      "Printing labels does not change stock.",
    ],
    related: [
      { label: "Products", href: "/admin/products" },
      { label: "Receive Stock", href: "/admin/inventory/receive" },
      { label: "Store POS", href: "/admin/pos" },
    ],
  },
  {
    route: "/admin/suppliers",
    area: "Inventory",
    title: "Suppliers",
    purpose:
      "The workshops and wholesalers you buy from. Choose one when receiving a delivery, and your spend with each is totalled in Accounting.",
    steps: [
      "Press Add a supplier.",
      "Enter at least the Name, plus any contact and GST details you have.",
      "Press Add supplier. It can now be chosen on Receive Stock.",
      "To change details later, press Edit on its row, then Save changes.",
    ],
    sections: [
      {
        heading: "Supplier details",
        items: [
          { term: "Name", text: "The workshop or wholesaler. Required, and must not already be on the list." },
          { term: "Contact person", text: "Who you deal with there." },
          { term: "Phone / Email", text: "How to reach them." },
          { term: "GSTIN", text: "Their GST number, needed to claim input credit. Saved in capitals." },
          { term: "Street address / Town or city / State / PIN code", text: "Where they are." },
          { term: "Cancel", text: "Closes the form without saving." },
        ],
      },
      {
        heading: "The list",
        items: [
          { term: "Supplier row", text: "The name, with contact person, phone, town and state, and GSTIN underneath — only those that were filled in." },
          { term: "Edit", text: "Opens the supplier's details to change them." },
          { term: "Retire", text: "Removes the supplier from this list and from the Supplier choice on Receive Stock. Past deliveries and Accounting totals are unchanged." },
        ],
      },
    ],
    notes: [
      "Retire happens straight away with no confirmation, and there is no button to bring a retired supplier back.",
      "Suppliers are never deleted, because past deliveries and the accounts refer to them.",
      "A retired supplier's name is still taken, so a new supplier cannot be added under the same name.",
      "Choosing a supplier is optional when receiving, but only deliveries with a supplier are counted in Accounting's Spend by supplier.",
    ],
    related: [
      { label: "Receive Stock", href: "/admin/inventory/receive" },
      { label: "Accounting", href: "/admin/accounting" },
    ],
  },
];
