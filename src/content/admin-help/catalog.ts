import type { HelpEntry, HelpSection } from "./types";

/** The piece form is the same page for a new piece and an existing one. */
const PIECE_FORM_SECTIONS: HelpSection[] = [
  { heading: "Top bar", items: [
    { term: "Published · Draft", text: "Whether the piece is on the website now. A draft is still a real piece: it can be stocked and sold at the counter, it just isn't shown online." },
    { term: "Save Draft", text: "Saves your changes and keeps the piece off the website. On a piece that is already published, this takes it offline." },
    { term: "Publish · Save & Publish", text: "Saves and puts the piece on the website. It only works once everything in Before you publish is ticked." },
    { term: "Cancel", text: "Back to Products without saving." },
  ] },
  { heading: "Product", items: [
    { term: "Product Name *", text: "The name clients see, e.g. “Kundan Choker Necklace”." },
    { term: "Category *", text: "Where the piece sits in the shop. Choose it before adding images — photographs are filed under the category." },
    { term: "Address on the site", text: "The piece's web address, /product/…, made from the name as you type. Press Edit to write your own." },
    { term: "Material", text: "What the piece is made of, e.g. Sterling Silver. Pick from your list or type. Material belongs to the piece, not to its variants: the same design in another material is a separate piece, because the price is different." },
    { term: "Tags", text: "Your own labels — festive edit, bridal, gift under 1k. Pick one already in use or type a new one and press Enter. They are tidied automatically (“Festive Edit” becomes festive edit). Offers reach tagged pieces through Offers → Piece Sets." },
    { term: "Description", text: "The words shown on the piece's page." },
  ] },
  { heading: "Pricing", items: [
    { term: "Price (₹) *", text: "The selling price clients pay. Every variant uses it unless you give that variant its own price." },
    { term: "Compare-at price (₹)", text: "An earlier or usual price, shown struck through. When it is higher than the price you see “Customers save ₹2,000 (10% off)”." },
    { term: "Cost price (₹)", text: "What the piece costs you. Never shown to a client. Once price and cost are both filled in you see the margin, e.g. “Margin ₹6,500 (65%)”, or a warning if you would sell below cost." },
    { term: "Stock", text: "Not set here. Stock is kept in Inventory, per variant; the On hand column below shows it." },
  ] },
  { heading: "Options and variants", items: [
    { term: "Colour · Size", text: "The forms the piece comes in. Tap a value from your list (these come from Catalog → Filters) or type a new one and press Enter. Leave both empty for a piece sold as a single item." },
    { term: "Generate variants", text: "Makes one variant for every combination — Gold and Silver in 16 and 18 inches gives four." },
    { term: "Add a one-off variant", text: "Adds a single row you name yourself, for a form that doesn't fit the options." },
    { term: "Variant", text: "Its name, built from its colour and size." },
    { term: "Price (₹)", text: "Leave empty to use the main price; fill it in when this variant costs more or less." },
    { term: "SKU · Barcode", text: "Created for each variant when you save (“on save” until then). Used at the counter and on labels." },
    { term: "On hand", text: "Pieces in stock for this variant, with how many are held for orders. The receive link opens Inventory → Receive stock." },
    { term: "Bin (remove)", text: "Removes a variant. The single variant of a one-item piece can't be removed." },
  ] },
  { heading: "Images", items: [
    { term: "Upload Images", text: "Add photographs by pressing the button or dropping them into the box. Drag a thumbnail to change the order." },
    { term: "Star · Primary", text: "The starred image is the cover on the website." },
    { term: "Alt text", text: "A short description of the photograph, read aloud to clients using screen readers." },
    { term: "All variants · a tab per value", text: "Photographs under All variants show for every variant. Photographs under a value, e.g. Gold, show for every Gold variant, whatever its size." },
    { term: "Move to…", text: "Moves a photograph to another tab, so nothing has to be uploaded twice." },
  ] },
  { heading: "Right-hand column", items: [
    { term: "Before you publish · Ready to publish", text: "The four things a piece needs to go online: Product name, Category selected, Price set, At least one image." },
    { term: "Visibility", text: "Shows Published or Draft. It is changed with the buttons in the top bar." },
    { term: "Featured", text: "Shows the piece in the website's featured sections." },
    { term: "Limited Edition", text: "Marks the piece's card as an exclusive, limited run." },
  ] },
];

const FILTER_FORM_SECTIONS: HelpSection[] = [
  { heading: "Filter Information", items: [
    { term: "Filter Name *", text: "What clients see above the choices, e.g. Metal Colour, Price Range, Occasion." },
    { term: "Slug * · Auto Generate", text: "A short web-friendly name for the filter. Auto Generate makes it from the name — the easiest choice." },
    { term: "Filter Type *", text: "Mostly for your own reference: the website shows a filter as colour swatches when every choice has a colour, and as a list otherwise. Color adds a colour picker to each choice here. The price filter on the website is a slider built from the pieces' own prices." },
    { term: "Description", text: "An optional note for your team." },
    { term: "Active", text: "Only active filters appear on the website and feed the pickers on the piece form." },
  ] },
  { heading: "Filter Options", items: [
    { term: "Option Label", text: "What clients see, e.g. “Under ₹5,000” or “Rose Gold”." },
    { term: "Option Value", text: "Kept with the choice. For Colour, Size and Material filters the website matches the choice's label against the piece's colour, size or material, so spell the label exactly as it is on the pieces." },
    { term: "Colour and Hex code", text: "Color filters only: the swatch clients see. Pick a colour or type its code, e.g. #B76E79." },
    { term: "Add Option", text: "Adds the option to the list above. Use the arrows to reorder, the bin to remove." },
  ] },
  { heading: "Assign to Categories", items: [
    { term: "Category ticks", text: "The category pages this filter appears on. The all-jewellery page offers every active filter." },
    { term: "Create Filter · Update Filter", text: "Saves. Nothing is saved until you press it — adding an option alone is not enough." },
  ] },
];

const BUDGET_TIER_FORM_SECTIONS: HelpSection[] = [
  { heading: "Tier Details", items: [
    { term: "Title *", text: "The card's heading on the home page, e.g. “Gifts under ₹25,000”." },
    { term: "Maximum Price (₹) *", text: "The top price. The card opens a page of pieces up to this price." },
    { term: "Active", text: "Only active tiers appear on the home page." },
  ] },
  { heading: "Appearance and Ordering", items: [
    { term: "Gradient CSS", text: "The card's background colours, written as a colour recipe, e.g. linear-gradient(135deg, #C9A227 0%, #8A6D1C 100%). A preview appears below. Required — a tier can't be saved without it." },
    { term: "Icon Name", text: "Saved with the tier but not currently shown on the website — the card always uses the same icon." },
    { term: "Display Order", text: "Lower numbers come first on the home page." },
    { term: "Create · Update", text: "Saves and returns to the list." },
  ] },
];

/** Help for the catalog screens. */
export const CATALOG_HELP: HelpEntry[] = [
  {
    route: "/admin/products",
    area: "Catalog",
    title: "Products",
    purpose: "Every piece in the shop, published or draft. Find a piece, change its price or stock at a glance, put pieces online or take them off, and tag or delete several at once.",
    steps: [
      "Search by name, or narrow the list with the category and sort choices (on a phone, press the sliders button to see them).",
      "Click a row to open the piece, or use the pencil.",
      "To act on several pieces, tick them; a bar appears with Publish, Unpublish, Tags and Delete.",
    ],
    sections: [
      { heading: "Top of the page", items: [
        { term: "Add Product", text: "Opens a blank piece form." },
        { term: "Export CSV", text: "Downloads the catalog as a spreadsheet file." },
        { term: "Bulk Upload", text: "Adds many pieces at once from a spreadsheet file." },
        { term: "Search products…", text: "Finds pieces by name. Press Enter or Search." },
        { term: "All Categories", text: "Shows only one category." },
        { term: "Sort by", text: "Newest First, Name, Price or Stock, either way round." },
        { term: "Group by category", text: "Shows every matching piece under a heading per category, on one page. Click a heading to fold it away." },
      ] },
      { heading: "The list", items: [
        { term: "Image", text: "The cover photograph. Click it to see it larger." },
        { term: "Price", text: "The selling price, with the compare-at price struck through beneath it when there is one." },
        { term: "Stock", text: "Pieces available to sell, across every location. In Stock means more than 10, Low means 1–10, Out means none." },
        { term: "− · number · +", text: "A quick stock correction for a piece sold as a single item. It is recorded in Inventory as an adjustment, “Set from the Products list”. A piece with several variants must be stocked per variant in Inventory → Stock. A retired piece's count can come down here but not go up." },
        { term: "Status switch · Published / Draft", text: "Puts the piece on the website or takes it off at once. Drafts still sell at the counter." },
        { term: "Retired", text: "The piece will never be restocked; what is left keeps selling. Hover for a reminder." },
        { term: "Pencil · Bin", text: "Open the piece, or delete it." },
      ] },
      { heading: "With pieces ticked", items: [
        { term: "Publish · Unpublish", text: "Puts every ticked piece online, or takes them all off." },
        { term: "Tags", text: "Add tags to, or remove tags from, every ticked piece in one go — the quick way to put twenty pieces into “festive edit” before an offer." },
        { term: "Delete", text: "Deletes the ticked pieces. Pieces that have been sold are left alone unless you tick “Also delete the N that have been sold”." },
      ] },
      { heading: "Deleting a piece", items: [
        { term: "Delete product?", text: "A piece that has never been sold is simply deleted. This can't be undone." },
        { term: "Delete a piece that has been sold?", text: "Says how many order lines mention it and offers two ways out." },
        { term: "Retire instead", text: "Keeps the piece, sells what is on the shelf, never restocks it, and takes it off the website by itself when the last one sells. Usually what you want." },
        { term: "Delete permanently", text: "Removes the piece from the catalog for good. Orders, invoices and stock history keep their record of it." },
      ] },
    ],
    notes: [
      "The list shows 20 pieces a page; use Previous and Next at the bottom.",
      "The status switch doesn't check the publish list, so a piece with no photograph can be put online from here. The piece's own Publish button does check.",
      "Stock is kept in Inventory. Receive new stock there — a retired piece can't be received.",
    ],
    related: [
      { label: "Stock", href: "/admin/inventory/stock" },
      { label: "Receive stock", href: "/admin/inventory/receive" },
      { label: "Piece Sets", href: "/admin/promotions/sets" },
  ] },
  {
    route: "/admin/products/new",
    area: "Catalog",
    title: "Add a piece",
    purpose: "Create a new piece: what it is, its price, the forms it comes in and its photographs. Stock is added afterwards in Inventory.",
    steps: [
      "Fill in Product Name, Category and Price.",
      "Add Material, Tags and a Description if you wish.",
      "If the piece comes in several colours or sizes, pick them under Options and press Generate variants.",
      "Add photographs and star the cover.",
      "Press Save Draft to keep it offline, or Publish once Before you publish is all ticked.",
      "Receive its stock in Inventory → Receive stock.",
    ],
    sections: PIECE_FORM_SECTIONS,
    notes: [
      "A piece with no options is saved as a single Default variant so it can be stocked and sold like any other.",
      "Each variant is given its own SKU and barcode when you save.",
      "If something is missing or can't be saved, a message tells you exactly what, and nothing is changed.",
    ],
    related: [{ label: "Receive stock", href: "/admin/inventory/receive" }, { label: "Filters (your Colour, Size and Material lists)", href: "/admin/filters" }],
  },
  {
    route: "/admin/products/[id]/edit",
    area: "Catalog",
    title: "Edit a piece",
    purpose: "Change anything about a piece — words, prices, variants, photographs — see its stock per variant, and retire it when you won't stock it again.",
    steps: [
      "Make your changes.",
      "Press Save & Publish to keep it online, or Save Draft to save and take it offline.",
      "To stop stocking it, press Retire this piece in the right-hand column.",
    ],
    sections: [
      ...PIECE_FORM_SECTIONS,
      { heading: "In the range · Retired", items: [
        { term: "Retire this piece", text: "For a piece you will never stock again. It keeps selling what is left, can't be received into stock, and leaves the website by itself when the last one sells. If none are left, it goes offline at once." },
        { term: "Reinstate", text: "Undoes retirement so the piece can be restocked. It doesn't put the piece back online — use Publish for that." },
      ] },
    ],
    notes: [
      "Save Draft on a published piece takes it off the website.",
      "Changing the name also changes the piece's web address, so old links to it stop working. Press Edit beside the address to put the old one back before saving.",
      "Stock can't be changed here. Use Inventory → Receive stock, or Adjustments for a correction.",
      "Price changes apply to new sales only; orders already placed keep their prices.",
      "To remove a piece altogether, use the bin on the Products list.",
    ],
    related: [{ label: "Products", href: "/admin/products" }, { label: "Stock", href: "/admin/inventory/stock" }, { label: "Adjustments", href: "/admin/inventory/adjustments" }],
  },
  {
    route: "/admin/products/bulk-upload",
    area: "Catalog",
    title: "Bulk Upload",
    purpose: "Add many pieces at once from a spreadsheet saved as a CSV file.",
    steps: [
      "Press Download Template and open it in Excel or Google Sheets.",
      "Fill one row per piece and save as CSV.",
      "Press Click to upload CSV file and choose your file.",
      "Check Preview & Validation; fix any rows marked Errors and upload again.",
      "Press Import N Products.",
    ],
    sections: [
      { heading: "The columns", items: [
        { term: "name · slug · price · stock · category", text: "Required. Slug is the web address, e.g. gold-necklace, and must not be used by another piece. Price is in rupees, e.g. 15999.00 for ₹15,999." },
        { term: "category", text: "Must match an existing category name (capitals don't matter)." },
        { term: "description · compareAtPrice · sku", text: "Optional." },
        { term: "isPublished", text: "true to put the piece online straight away; anything else makes it a draft." },
      ] },
      { heading: "Preview & Validation", items: [
        { term: "Valid · Errors", text: "How many rows can be imported, and how many can't. Rows with errors are skipped." },
        { term: "Warnings", text: "Gentle reminders — no description, or a compare-at price below the price. The row still imports." },
        { term: "Cancel", text: "Clears the file so you can choose another." },
      ] },
    ],
    notes: [
      "Only the first 50 rows are shown in the preview, but every valid row is imported.",
      "A message at the end says how many were imported and how many failed — usually because a slug is already taken.",
      "Imported pieces have no photographs, variants, material or tags. Open each one, add them and save.",
      "The stock column is not added to Inventory. After importing, open and save each piece, then receive its stock in Inventory → Receive stock.",
      "The file has to be chosen by clicking; dropping it on the box doesn't work.",
    ],
    related: [{ label: "Products", href: "/admin/products" }, { label: "Categories", href: "/admin/categories" }],
  },
  {
    route: "/admin/categories",
    area: "Catalog",
    title: "Categories",
    purpose: "The groups your pieces are sorted into — Necklaces, Earrings, Bangles. Categories give the website its menu and the home page its Explore section.",
    steps: [
      "Press Add Category, fill in the name and press Create.",
      "Click the picture area on the card, or drop a photograph on it, to set its image.",
      "Drag cards to set the order they appear in on the website.",
    ],
    sections: [
      { heading: "Add New Category · Edit Category", items: [
        { term: "Name *", text: "What clients see." },
        { term: "Slug *", text: "The category's web address, filled in from the name. Change it only if you need to." },
        { term: "Description", text: "A short line about the category." },
        { term: "Show in navigation & Explore section", text: "On by default. Turn off to keep a category out of the menu and home page." },
      ] },
      { heading: "Each card", items: [
        { term: "Picture", text: "The category's image. Without one, the photograph of its oldest piece stands in." },
        { term: "Star", text: "Gold when the category is shown in the menu and Explore section. Click to show or hide it." },
        { term: "Crown", text: "Marks the first category shown in the menu and Explore section." },
        { term: "N products", text: "Opens a list of the category's pieces, with the same search, sort, stock and publish controls as Products." },
        { term: "Pencil · Bin", text: "Edit the name, slug and description, or delete the category." },
      ] },
    ],
    notes: [
      "A category that still holds pieces can't be deleted — move or delete those pieces first. Deleting can't be undone.",
      "Changing a slug changes the category's web address, so old links to it stop working.",
    ],
    related: [{ label: "Products", href: "/admin/products" }, { label: "Filters", href: "/admin/filters" }],
  },
  {
    route: "/admin/filters",
    area: "Catalog",
    title: "Filters",
    purpose: "The choices clients use to narrow a category page — Metal Colour, Size, Price Range, Occasion. Filters named for colour, size or material also supply the lists you pick from on the piece form.",
    steps: ["Press New Filter to add one.", "Use the switch to turn a filter on or off.", "Use the pencil to change its options or categories."],
    sections: [
      { heading: "The list", items: [
        { term: "Type", text: "How the filter was set up (CHECKBOX, DROPDOWN, RANGE, COLOR). The website decides swatches or a list from whether the choices have colours." },
        { term: "Options", text: "How many choices it offers." },
        { term: "Categories", text: "How many category pages show it." },
        { term: "Active", text: "Turns the filter on or off on the website straight away." },
        { term: "Pencil · Bin", text: "Edit, or delete the filter and all its options." },
      ] },
    ],
    notes: [
      "A filter whose name mentions colour, size or material (or metal, stone, length and similar) feeds the Colour, Size and Material pickers on the piece form. Other filters, like Occasion, are only for clients.",
      "Deleting a filter can't be undone. Pieces keep their colours and sizes; only the choices clients filter by go.",
    ],
    related: [{ label: "Categories", href: "/admin/categories" }],
  },
  {
    route: "/admin/filters/new",
    area: "Catalog",
    title: "New filter",
    purpose: "Create a filter, its choices, and the category pages it appears on.",
    steps: [
      "Enter Filter Name, press Auto Generate, and choose the Filter Type.",
      "Add each choice under Add New Option and press Add Option.",
      "Tick the categories it should appear on.",
      "Press Create Filter.",
    ],
    sections: FILTER_FORM_SECTIONS,
    related: [{ label: "Filters", href: "/admin/filters" }],
  },
  {
    route: "/admin/filters/[id]/edit",
    area: "Catalog",
    title: "Edit filter",
    purpose: "Change a filter's name, type, choices or the category pages it appears on.",
    sections: FILTER_FORM_SECTIONS,
    notes: [
      "Changes take effect only when you press Update Filter.",
      "Removing a choice here also removes it from the pickers on the piece form. Pieces that already use it keep it.",
    ],
    related: [{ label: "Filters", href: "/admin/filters" }],
  },
  {
    route: "/admin/budget-tiers",
    area: "Catalog",
    title: "Budget Price Tiers",
    purpose: "The “shop by budget” cards on the home page, e.g. Under ₹25,000 or Under ₹1,00,000. Each opens a page of pieces up to its price.",
    steps: ["Press Add Tier to create one.", "Use the pencil to change it, or the bin to delete it."],
    sections: [
      { heading: "The list", items: [
        { term: "Order", text: "Position on the home page; lower comes first." },
        { term: "Max Price", text: "The top price of pieces the card leads to." },
        { term: "Gradient", text: "A preview of the card's background." },
        { term: "Status", text: "Active tiers show on the home page; Inactive ones are kept but hidden." },
      ] },
    ],
    notes: ["Deleting a tier can't be undone. To hide one for now, set it Inactive instead.", "The section disappears from the home page when no tier is active."],
  },
  {
    route: "/admin/budget-tiers/new",
    area: "Catalog",
    title: "New budget tier",
    purpose: "Add a “shop under ₹…” card to the home page.",
    steps: ["Enter a Title and Maximum Price (₹).", "Set Display Order and, if you like, a background.", "Press Create."],
    sections: BUDGET_TIER_FORM_SECTIONS,
    related: [{ label: "Budget Price Tiers", href: "/admin/budget-tiers" }],
  },
  {
    route: "/admin/budget-tiers/[id]",
    area: "Catalog",
    title: "Edit budget tier",
    purpose: "Change a tier's title, price, look or position, or switch it off.",
    sections: BUDGET_TIER_FORM_SECTIONS,
    related: [{ label: "Budget Price Tiers", href: "/admin/budget-tiers" }],
  },
];
