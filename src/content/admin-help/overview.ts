import type { HelpEntry } from "./types";

/** Help for the overview screens. */
export const OVERVIEW_HELP: HelpEntry[] = [
  {
    route: "/admin",
    area: "Overview",
    title: "Admin home",
    purpose:
      "The admin's front door. Opening it takes you straight to the Dashboard; there is nothing else on this address.",
    related: [{ label: "Dashboard", href: "/admin/dashboard" }],
  },
  {
    route: "/admin/dashboard",
    area: "Overview",
    title: "Dashboard",
    purpose:
      "The first screen you see after signing in (opening /admin brings you here too). A quick look at the shop: takings, orders, pieces on sale, clients, the last seven days and the latest orders.",
    steps: [
      "Glance at the four figures across the top for the state of the shop today.",
      "Read Sales Overview for how the last seven days have gone.",
      "Check Orders by Status for anything still waiting — Pending and Processing orders need attention.",
      "Look down Recent Orders for the ten newest orders, then open Orders to act on one.",
    ],
    sections: [
      {
        heading: "The four figures",
        items: [
          {
            term: "Sales this month",
            text: "What clients actually paid this month so far, in India time, on the website and at the counter. Counts Processing, Shipped, Out for delivery and Delivered orders; Pending, Cancelled and Refunded are left out. Discounts are taken off; delivery and cash on delivery charges are included; GST is counted once, whether or not prices included it. The line beneath gives the all-time figure, counted the same way.",
          },
          {
            term: "… vs 1–N <last month>",
            text: "This month so far against the same days of last month (e.g. 1–14 Oct against 1–14 Sep), so the comparison is like for like. When last month had no sales in that stretch, it says so instead of showing a percentage.",
          },
          {
            term: "Orders",
            text: "Every order ever placed, on the website and at the counter, whatever its status — including cancelled ones and website orders never paid for. The line below, “orders today”, counts those placed since midnight India time.",
          },
          {
            term: "Active Products",
            text: "Pieces that are switched on and published, so clients can see and buy them. The line below gives the total number of pieces in the catalogue, including drafts and hidden ones.",
          },
          {
            term: "Customers",
            text: "Clients who have created an account on the website (“Total registered users”). Admin accounts are not counted, and nor are counter clients, who buy without an account.",
          },
        ],
      },
      {
        heading: "Charts",
        items: [
          {
            term: "Sales Overview",
            text: "A line showing sales for each of the last seven days, today included, labelled by weekday. Counted the same way as Sales this month, by the India-time day the order was placed. Hover over a day to see the exact figure in ₹.",
          },
          {
            term: "Orders by Status",
            text: "How many orders are at each stage: Pending, Processing, Shipped, Out for delivery, Delivered, Cancelled and Refunded. It covers every order since the shop opened, not only recent ones.",
          },
        ],
      },
      {
        heading: "Recent Orders",
        items: [
          { term: "Order ID", text: "The order number, as it appears on the invoice and in Orders." },
          {
            term: "Customer",
            text: "The client's name, with their email or phone number beneath it when the order has one.",
          },
          {
            term: "Customer (Walk-in customer)",
            text: "Shown for a counter sale where no name was taken.",
          },
          {
            term: "Total",
            text: "What the client paid for the order — after offers and discounts, with delivery and GST.",
          },
          {
            term: "Status",
            text: "Where the order stands — for example Processing or Out for delivery.",
          },
          { term: "Date", text: "How long ago the order was placed, such as “3 hours ago”." },
        ],
      },
    ],
    notes: [
      "The dashboard is read-only, and the rows in Recent Orders cannot be clicked. To change an order, open it from Orders.",
      "Counter sales are recorded as Delivered the moment the bill is taken, so they count in Sales this month straight away.",
      "Website orders paid by UPI or Card count once payment is confirmed and they move to Processing. Cash on delivery orders go straight to Processing, so they count before the cash is collected.",
      "“Today”, “this month” and the days on the chart follow India time, whatever the server's clock, so a sale just after midnight counts towards the new day.",
      "The figures are worked out fresh each time you open the page. Refresh it to see the latest.",
    ],
    related: [
      { label: "Orders", href: "/admin/orders" },
      { label: "Sales Insights", href: "/admin/sales-insights" },
      { label: "Accounting", href: "/admin/accounting" },
      { label: "Analytics", href: "/admin/analytics" },
    ],
  },
  {
    route: "/admin/analytics",
    area: "Overview",
    title: "Analytics",
    purpose:
      "Which pieces sell best, and which ones clients look at and add to their bag. Use it to decide what to restock, feature on the homepage or put into an offer.",
    steps: [
      "Read the three figures at the top for takings, recent orders and new clients.",
      "Look at Top Selling Products for the ten pieces that have sold in the greatest number. Click a row to open that piece.",
      "Look at Product Engagement for the ten most viewed pieces, and how often a look turns into an add to bag.",
      "Press Export Report to download sales by piece as a spreadsheet.",
    ],
    sections: [
      {
        heading: "The three figures",
        items: [
          {
            term: "Total Revenue",
            text: "What clients actually paid since the shop opened, counted exactly as on the Dashboard: Processing to Delivered orders, after offers and discounts, with delivery and GST (counted once).",
          },
          {
            term: "Orders (30 days)",
            text: "Every order placed in the last 30 days, counted back from this moment, on the website and at the counter, whatever its status — cancelled ones included.",
          },
          {
            term: "New Customers",
            text: "Clients who created an account on the website in the last 30 days. Counter clients buy without an account, so they are not counted.",
          },
        ],
      },
      {
        heading: "Top Selling Products",
        items: [
          { term: "Rank", text: "#1 is the piece sold in the greatest number; the list shows the top ten." },
          {
            term: "Product",
            text: "The piece's picture and name. A piece that has since been deleted still appears under the name it was sold with, without a picture, and cannot be opened.",
          },
          { term: "Units Sold", text: "Pieces sold on orders that count as sales (Processing to Delivered), since the shop opened." },
          {
            term: "Revenue (incl. GST)",
            text: "What clients paid for every unit of the piece, after offers and discounts, GST included (delivery is not shared out to pieces).",
          },
          { term: "Clicking a row", text: "Opens that piece's edit page in Products." },
        ],
      },
      {
        heading: "Product Engagement",
        items: [
          {
            term: "Product",
            text: "The ten pieces whose pages have been viewed most since tracking began. When a piece is deleted, its views go with it.",
          },
          {
            term: "Views",
            text: "How many times the piece's page was opened on the website. Every visit counts, repeat visits included; a page left within a second is not counted.",
          },
          {
            term: "Avg. Time Viewing",
            text: "On average, how many seconds a client spent looking at the piece. A longer time usually means real interest.",
          },
          { term: "Added to Cart", text: "How many times the piece was added to a bag." },
          {
            term: "View → Cart Rate",
            text: "Out of every 100 views, how many ended in an add to bag. 20% or more is highlighted — a piece doing well. A piece with many views and a low rate may need a better picture, description or price.",
          },
        ],
      },
      {
        heading: "Export Report",
        items: [
          {
            term: "Export Report",
            text: "Downloads a spreadsheet (CSV file) with one row per piece sold, best sellers first: ProductID (blank for a deleted product), ProductName, UnitsSold and Amount paid (₹ — what clients paid for those pieces, after discounts, with GST counted once). Only sales count: cancelled, refunded and unpaid orders are left out, and cash on delivery orders count from Processing. Delivery charges belong to no piece, so the column totals the Dashboard's sales less delivery.",
          },
        ],
      },
    ],
    notes: [
      "Top Selling Products and the exported spreadsheet count only sales (Processing to Delivered); cancelled, refunded and unpaid orders are left out.",
      "Product Engagement fills in as people browse the website — including your own staff when they look at pieces there. Counter sales do not add views.",
      "A piece renamed after it sold stays one row in Top Selling Products, under its newest name.",
      "The figures here cover all time or the last 30 days. For a chosen period, day by day, use Sales Insights.",
    ],
    related: [
      { label: "Dashboard", href: "/admin/dashboard" },
      { label: "Sales Insights", href: "/admin/sales-insights" },
      { label: "Products", href: "/admin/products" },
      { label: "Offers", href: "/admin/promotions" },
    ],
  },
];
