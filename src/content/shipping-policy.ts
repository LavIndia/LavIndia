import type { ContentPageCopy } from "@/modules/marketing";

export const shippingPolicyCopy: ContentPageCopy = {
  title: "Shipping Policy",
  intro:
    "How your order is packed, when it leaves us, and what happens if it does not arrive.",
  lastUpdated: "20 September 2026",
  sections: [
    {
      heading: "Dispatch",
      body: [
        "Orders for pieces that are in stock are usually dispatched within two working days. Orders that include a made-to-order or limited-edition piece take longer, and the expected date is confirmed to you by email once the order is accepted.",
        "We do not dispatch on Sundays or public holidays. An order placed late on a Friday will normally leave us on the following Monday or Tuesday.",
      ],
    },
    {
      heading: "Delivery times",
      bullets: [
        "Metropolitan areas: typically two to four working days after dispatch.",
        "Other serviceable locations in India: typically four to seven working days after dispatch.",
        "Remote or restricted postcodes may take longer, and our courier will contact you if access is a problem.",
      ],
    },
    {
      heading: "Charges",
      body: [
        "Delivery charges, where they apply, are calculated at checkout and shown before you pay. Orders paid for in advance and orders placed for cash on delivery may be charged differently, and any cash-on-delivery fee is shown separately at checkout rather than folded into the item price.",
      ],
    },
    {
      heading: "Packing and insurance",
      body: [
        "Every piece travels in its own box, inside outer packaging that does not identify its contents. Shipments are insured in transit until they are delivered to the address you gave us.",
      ],
    },
    {
      heading: "Tracking your order",
      body: [
        "You will receive a tracking reference by email when your order is dispatched, and you can follow the order's progress from the orders page in your account at any time.",
      ],
    },
    {
      heading: "If something goes wrong",
      bullets: [
        "If the parcel appears damaged or tampered with on arrival, refuse the delivery and tell us the same day.",
        "If tracking shows the parcel as delivered but you do not have it, tell us within forty-eight hours so that we can open an investigation with the courier while the record is still available.",
        "If an address was entered incorrectly, tell us before dispatch and we will correct it. After dispatch we will do what we can, but a redirection is not always possible.",
      ],
    },
    {
      heading: "International orders",
      body: [
        "We currently ship within India only. If you are outside India and want a piece, write to us — we will tell you honestly whether we can arrange it rather than take an order we cannot fulfil.",
      ],
    },
  ],
};
