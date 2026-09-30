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
            term: "Total Revenue",
            text: "The value of pieces sold since the shop opened, on the website and at the counter, at their list prices. It counts orders that are Processing, Shipped, Out for Delivery or Delivered; Pending, Cancelled and Refunded orders are left out. It is taken before offers and discounts, and leaves out delivery and cash on delivery charges. GST is inside the figure only where prices included GST. Accounting shows the discounts and delivery charges for a chosen period.",
          },
          {
            term: "… from last month",
            text: "The small percentage under Total Revenue. It sets the all-time figure against part of last month's sales, so it is usually large and is not a like-for-like comparison. For a true month-on-month view, use Sales Insights.",
          },
          {
            term: "Orders",
            text: "Every order ever placed, on the website and at the counter, whatever its status — including cancelled ones and website orders never paid for. The line below, “orders today”, counts those placed since midnight.",
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
            text: "A line showing sales for each of the last seven days, today included, labelled by weekday. Counted the same way as Total Revenue, by the day the order was placed. Hover over a day to see the exact figure in ₹.",
          },
          {
            term: "Orders by Status",
            text: "How many orders are at each stage: Pending, Processing, Shipped, Out for Delivery, Delivered, Cancelled and Refunded. It covers every order since the shop opened, not only recent ones.",
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
            text: "The pieces on the order at their list prices, in ₹ — before offers and discounts, and without delivery charges. Open the order in Orders to see what the client paid.",
          },
          {
            term: "Status",
            text: "Where the order stands, shown in capitals — for example PROCESSING or OUT_FOR_DELIVERY.",
          },
          { term: "Date", text: "How long ago the order was placed, such as “3 hours ago”." },
        ],
      },
    ],
    notes: [
      "The dashboard is read-only, and the rows in Recent Orders cannot be clicked. To change an order, open it from Orders.",
      "Counter sales are recorded as Delivered the moment the bill is taken, so they count in Total Revenue straight away.",
      "Website orders paid by UPI or Card count once payment is confirmed and they move to Processing. Cash on delivery orders go straight to Processing, so they count before the cash is collected.",
      "“Today” and the days on the chart follow the server's clock. If that clock runs on UTC, a day starts at 5:30 am India time, so a sale just after midnight can show under the day before.",
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
            text: "The value of pieces sold since the shop opened (“All time”), counted exactly as on the Dashboard: Processing, Shipped, Out for Delivery and Delivered orders, at list prices before offers and discounts, without delivery charges.",
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
          { term: "Units Sold", text: "How many of that piece have been sold, across every order since the shop opened." },
          {
            term: "Revenue",
            text: "The price actually charged for the piece (after offers and discounts), added up across its orders, in ₹. Where one order held two or more of the same piece, the price is counted once for that order, so for pieces sold in multiples this reads low — the exported report counts every unit.",
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
            text: "Downloads a spreadsheet (CSV file) with one row per piece sold: ProductID, ProductName, UnitsSold and Revenue (₹, price charged × units). It counts only orders whose payment has been received, so a cash on delivery order is included once it is marked paid. Rows are not in ranked order.",
          },
        ],
      },
    ],
    notes: [
      "Top Selling Products counts every order ever placed, including ones later cancelled or refunded. The exported spreadsheet counts paid orders only, so the two can differ.",
      "Product Engagement fills in as people browse the website — including your own staff when they look at pieces there. Counter sales do not add views.",
      "A piece renamed after it sold can appear twice in Top Selling Products, once under each name.",
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
