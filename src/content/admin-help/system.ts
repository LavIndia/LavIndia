import type { HelpEntry } from "./types";

/** Help for the system screens. */
export const SYSTEM_HELP: HelpEntry[] = [
  {
    route: "/admin/settings",
    area: "System",
    title: "Settings",
    purpose:
      "The shop's own details in one place: logo, business details, UPI for the counter QR, delivery charges and GST, client tiers, links, the reassurances shown to clients, and how the shop appears on Google.",
    steps: [
      "To change the logo, pick one of the house marks or press Upload your own. The logo saves on its own, straight away, and saving the rest of the page never changes it.",
      "For everything else, change the fields you need in any of the cards.",
      "Press Save Changes at the bottom of the page. One press saves every card.",
      "Wait for “Settings updated successfully”. If a field is refused, the message names it — correct it and save again.",
    ],
    sections: [
      {
        heading: "Logo",
        items: [
          {
            term: "The mark at the top",
            text: "The logo in use now — “Your logo”, or “The default mark” when none is chosen. Today it appears in the website header, beside the shop name; printed bills do not yet carry it.",
          },
          {
            term: "Lotus · Brilliant · Monogram",
            text: "Marks drawn for LavIndia. Click one to use it; the one in use is outlined.",
          },
          {
            term: "Upload your own",
            text: "Choose your own logo file. SVG stays sharp at every size, from a barcode label to a shop sign; PNG, WebP and JPEG also work. Up to 2MB.",
          },
          {
            term: "Use the default",
            text: "Shown only when a logo is chosen. Puts the plain default mark back.",
          },
        ],
      },
      {
        heading: "Business Information",
        items: [
          {
            term: "Business Name *",
            text: "The shop's name. Required. Shown on the website, on bills and on the Dashboard, and used as the name in the counter UPI QR when no other name is given.",
          },
          { term: "Address", text: "The shop's address, shown in the website footer, on the contact page and on bills." },
          {
            term: "Email",
            text: "Optional. The shop's contact email, shown on the website and on bills. Leave it empty if you prefer none; if filled in it must be a complete address, such as care@yourshop.in.",
          },
          { term: "Contact Number", text: "The phone number clients should call, shown in the footer, on the contact page and on bills." },
          { term: "GST Number", text: "The shop's GSTIN, printed on invoices and in the website footer." },
        ],
      },
      {
        heading: "Payments",
        items: [
          {
            term: "UPI ID",
            text: "The UPI ID you collect payments in, from GPay, PhonePe, Paytm or your bank's app — for example lavindia@okhdfcbank. Once saved, every counter bill shows a QR with the exact amount filled in. Take a ₹1 test payment from your own phone after changing it: a wrong ID sends clients' money to a stranger and cannot be recovered.",
          },
          {
            term: "Name shown to the customer",
            text: "The name the client sees in their UPI app before they pay. Use the name they know from your shopfront. Leave blank to use the Business Name.",
          },
        ],
      },
      {
        heading: "Delivery charges and GST",
        items: [
          {
            term: "Standard delivery",
            text: "What checkout adds, in ₹, when a website client chooses standard delivery. Set it to 0 to make it free. Each charge on this card can be at most ₹10,000.",
          },
          {
            term: "Express delivery",
            text: "What checkout adds, in ₹, when a website client chooses express delivery. Set it to 0 to make it free.",
          },
          {
            term: "Cash on delivery fee",
            text: "What checkout adds, in ₹, when a client chooses to pay in cash on delivery. It covers the courier's collection charge and banking the cash. Set it to 0 to make it free.",
          },
          {
            term: "Website prices include GST",
            text: "On: the client pays the price shown, and the invoice shows the GST inside it. Off: GST is added at checkout, on top of the price shown.",
          },
          {
            term: "Counter prices include GST",
            text: "On: the tag price is what the client pays. Off: GST is added to the bill at the counter.",
          },
        ],
      },
      {
        heading: "Client tiers",
        items: [
          {
            term: "VIP from · Gold from · Silver from",
            text: "The lifetime spend, in ₹, at which a client enters each tier on the Customers screen and in its spreadsheet. Spend is what they actually paid on the website and at the counter, less anything cancelled or refunded. VIP must be above Gold, Gold above Silver, and Silver above ₹0; a client below Silver is Regular. A change re-tiers every client at once; nothing is stored against the client.",
          },
        ],
      },
      {
        heading: "Social Media Links",
        items: [
          {
            term: "Facebook · Instagram · Twitter · LinkedIn",
            text: "The full web address of each of the shop's pages, starting with https:// — for example https://instagram.com/yourshop. Leave any blank that you don't use. They are kept here ready, but the website does not show them yet.",
          },
        ],
      },
      {
        heading: "Marketplace Links",
        items: [
          {
            term: "Amazon Store · Flipkart Store · Myntra Store · Blinkit Store · Zepto Store",
            text: "The full web address of the shop's page on each marketplace, starting with https://. Each one you fill in appears in the website footer; blank ones are hidden.",
          },
        ],
      },
      {
        heading: "Trust Badges",
        items: [
          {
            term: "Cash on Delivery Available",
            text: "Shows a “COD Available” badge on the homepage. It only changes the badge — it does not switch cash on delivery on or off at checkout.",
          },
          {
            term: "Total Customers",
            text: "Shown on the homepage as “Loved by 9L+ Customers”, with what you type in place of 9L+. Leave it blank to hide this badge.",
          },
          {
            term: "Customer Rating (out of 5)",
            text: "Shown under Total Customers as “4.8 ⭐ Google Rating”. It appears only when Total Customers is filled in.",
          },
          {
            term: "Support Start Time · Support End Time",
            text: "The hours when a client can reach you, shown on the homepage under Customer Support. Leave both blank to hide them.",
          },
        ],
      },
      {
        heading: "SEO Settings",
        items: [
          {
            term: "Meta Title",
            text: "The shop's title in Google results and on the browser tab. Leave blank to use the Business Name.",
          },
          {
            term: "Meta Description",
            text: "The line or two Google may show beneath the title. Up to 500 characters; about 150 reads best.",
          },
          {
            term: "Meta Keywords",
            text: "Words that describe the shop, separated by commas. Saved for your records; the website does not use them today, and Google ignores them.",
          },
        ],
      },
      {
        heading: "Footer Settings",
        items: [
          {
            term: "Copyright Text",
            text: "The line at the very bottom of every website page, for example © 2026 LavIndia. All rights reserved.",
          },
        ],
      },
    ],
    notes: [
      "Free delivery above a spend is not a setting here. Create a Free delivery offer in Offers — it can then be scheduled, paused and ended like any other offer.",
      "Delivery charges and the GST switches apply to new orders and bills only. Orders already placed keep what they were charged.",
      "After you save, changes can take up to a minute to show on the website.",
      "The logo saves the moment you choose it. Every other card needs Save Changes — leaving the page without saving loses what you typed.",
      "After changing the logo, reload the page before you change and save anything else. Otherwise Save Changes can put the previous logo back.",
      "Bills already issued keep the business details they were printed with. New details appear on new bills only.",
      "The trust badges appear in the homepage's trust badges section, when that section is shown on the homepage.",
      "Links must be full web addresses beginning with https://, and the email must be complete, or the save will fail.",
      "Every save is recorded in Audit Logs under SiteSettings.",
    ],
    related: [
      { label: "Offers (for free delivery)", href: "/admin/promotions" },
      { label: "Store POS", href: "/admin/pos" },
      { label: "Audit Logs", href: "/admin/audit-logs" },
    ],
  },
  {
    route: "/admin/audit-logs",
    area: "System",
    title: "Audit Logs",
    purpose:
      "A record of who changed what in the admin, and when. Use it to check who edited a piece, changed a setting, ran an offer or rang up a counter sale.",
    steps: [
      "Open Audit Logs. The newest entries are at the top.",
      "Find the time you are interested in under Date & Time.",
      "Read across: who (Admin), what they did (Action), and to what (Entity).",
      "Hover over Details to see the full record of that change.",
    ],
    sections: [
      {
        heading: "Columns",
        items: [
          { term: "Date & Time", text: "When the change was made, to the second, for example 1 Oct 2026, 4:32:10 pm." },
          { term: "Admin", text: "The person who made it, by name — or a reference code when no name was recorded." },
          {
            term: "Action",
            text: "What was done, in words: Created, Updated and Deleted are the most common. Others include Counter sale, Stock received, stock adjustments, Duplicated, Codes generated, Bulk tagged, and Offer made live / paused / resumed / ended / archived / restored. Hover an action to see its system code.",
          },
          {
            term: "Entity",
            text: "The kind of thing changed — for example Product, Category, Order, Inventory, Promotion (an offer), PieceSet, SiteSettings, HeroBanner, PromoBanner or Supplier.",
          },
          {
            term: "Entity ID",
            text: "The first eight characters of that item's reference, useful when two entries concern the same item. A dash means the entry is not about a single item.",
          },
          {
            term: "Details",
            text: "The technical record of the change, such as the fields that were saved or the stock before and after. Long entries are cut short — hover to read all of it.",
          },
        ],
      },
    ],
    notes: [
      "Shows the latest 100 entries. Older ones are kept but are not shown on this screen. There is no search or filter.",
      "Times follow the server's clock. If it runs on UTC, times read 5 hours 30 minutes behind India time.",
      "Entries cannot be edited or deleted — that is what makes the record trustworthy.",
      "A Settings save lists every field on the form in Details, not only the ones you changed.",
      "Changes clients make on the website, such as placing an order, are not listed here — only actions taken in the admin.",
    ],
    related: [
      { label: "Settings", href: "/admin/settings" },
      { label: "Stock movements", href: "/admin/inventory/movements" },
    ],
  },
];
