import type { HelpEntry } from "./types";

/** Help for the customer screens. */
export const CUSTOMERS_HELP: HelpEntry[] = [
  {
    route: "/admin/customers",
    area: "Sales",
    title: "Customers",
    purpose: "Clients who have an account on the website, with how many orders they have placed and what they have spent.",
    steps: [
      "Search by name, email or mobile (any format: +91, a leading 0 or spaces), or tap a tier — VIP, Gold, Silver, Regular — to see only those clients. Press Export CSV for a spreadsheet of the list as shown.",
    ],
    sections: [
      {
        heading: "Columns",
        items: [
          { term: "Name / Contact", text: "The name on the account, with email and mobile. A client who gave no name is listed under their mobile (or email); empty details are left out." },
          { term: "Total Orders", text: "Every order on the account, plus counter sales made under the same mobile number — cancelled ones and those awaiting payment included." },
          { term: "Successful", text: "Orders that are Shipped, Out for delivery or Delivered." },
          { term: "Returned", text: "Orders that were Cancelled or Refunded." },
          { term: "Total Spent", text: "What the client actually paid on Processing to Delivered orders, website and counter (matched by mobile): after discounts, with delivery and GST." },
          { term: "Discount Saved", text: "What offers and discounts took off their orders." },
          { term: "Tier", text: "Set by Total Spent (what they actually paid). The rupee amount at which each tier begins is set in Settings → Client tiers (₹50,000 / ₹20,000 / ₹5,000 unless changed); below Silver a client is Regular." },
          { term: "Joined", text: "When the account was created." },
        ],
      },
    ],
    notes: [
      "Clients are shown 25 to a page, newest accounts first; use Previous / Next at the bottom. A search or tier stays applied as you page, and Clear removes both.",
      "On a phone each client is a card.",
      "Walk-in counter clients without a website account aren't listed, but counter sales made under a client's mobile number do count towards that client. Customer Segments shows everyone who has bought, matching counter and website purchases by mobile number.",
      "Nothing can be edited on this screen.",
      "The spreadsheet uses the same figures as this screen, holds exactly the clients currently shown (search and tier included), and adds each client's tier.",
    ],
    related: [{ label: "Customer Segments", href: "/admin/customers/rfm" }, { label: "Orders", href: "/admin/orders" }, { label: "Offers", href: "/admin/promotions" }, { label: "Settings", href: "/admin/settings" }],
  },
  {
    route: "/admin/customers/rfm",
    area: "Sales",
    title: "Customer Segments",
    purpose: "Groups every client who has bought by how recently they bought, how often and how much they spend. It shows who to thank, who to call, and who is drifting away.",
    steps: [
      "Read the segments at the top. They are ordered by the money they carry.",
      "Look at the grid for the overall shape of your clients.",
      "Find the names in the Customers table and act on each segment's suggestion.",
    ],
    sections: [
      {
        heading: "The three scores (R F M)",
        items: [
          { term: "R: Recency", text: "How recently they last bought. 5 is the most recent fifth of your clients." },
          { term: "F: Frequency", text: "How many orders they have placed. 5 is the fifth who buy most often." },
          { term: "M: Monetary", text: "How much they have paid in total. 5 is the top fifth of spenders." },
          { term: "Compared with your own clients", text: "Scores aren't fixed rupee amounts. They rank each client against LavIndia's other clients." },
        ],
      },
      {
        heading: "Headline figures",
        items: [
          { term: "Customers who have bought", text: "Everyone with at least one order that counts." },
          { term: "Lifetime revenue", text: "What those clients have paid, all time." },
          { term: "Champions and loyal / At risk of being lost", text: "Head counts of your best clients, and of those in Cannot lose or At risk." },
        ],
      },
      {
        heading: "Segments",
        items: [
          { term: "Champions", text: "Bought recently, buy often and spend the most. Give them first sight of new pieces." },
          { term: "Loyal", text: "Buy consistently, though not always the largest orders." },
          { term: "Potential loyalist", text: "Recent buyers who have come back more than once." },
          { term: "New / Promising", text: "One purchase, very recently (New) or fairly recently (Promising)." },
          { term: "Needs attention / About to sleep", text: "Bought a while ago. Needs attention used to buy often. About to sleep didn't." },
          { term: "At risk / Cannot lose", text: "Bought regularly, but not for a long while. Cannot lose were also big spenders. Call them personally." },
          { term: "Hibernating / Lost", text: "Long since bought, and rarely. Lost bought once, long ago." },
          { term: "Per order / % of revenue", text: "Each segment's average order and its share of all revenue." },
        ],
      },
      {
        heading: "Grid and table",
        items: [
          { term: "Where the customers sit", text: "A 5×5 grid, with Recency up the side and Frequency across. Darker squares hold more people. Weight in the lower-left means many clients bought once, long ago." },
          { term: "Customers", text: "Biggest spenders first: name (or Walk-in customer), mobile, and whether they bought at the counter, online or both." },
          { term: "Segment, R F M, Orders, Spend, Last bought", text: "Their group, their three scores, their order count, total paid, and how long ago they last bought." },
        ],
      },
    ],
    notes: [
      "Counter and website purchases by the same person are combined, matched on mobile number. Ask for the mobile at the counter. A counter sale with no mobile, and no website account, can't be counted here.",
      "Cancelled and refunded orders are left out. Website orders still awaiting payment are left out.",
      "The page refreshes at most once an hour, so a sale just made may not show yet.",
      "Scores are relative, so a client can move to another segment as other clients buy, without doing anything themselves.",
    ],
    related: [{ label: "Customers", href: "/admin/customers" }, { label: "Orders", href: "/admin/orders" }, { label: "Offers", href: "/admin/promotions" }, { label: "Sales Insights", href: "/admin/sales-insights" }],
  },
];
