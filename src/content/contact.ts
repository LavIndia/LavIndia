import type { ContentPageCopy } from "@/modules/marketing";

export const contactCopy: ContentPageCopy = {
  title: "Contact Us",
  intro:
    "A real person reads every message. Tell us what you need and we will answer properly rather than quickly.",
  sections: [
    {
      heading: "What to include",
      body: [
        "If your question is about an existing order, quote the order number — it is on your invoice and on the orders page of your account. That one detail saves a round of email in almost every case.",
      ],
      bullets: [
        "Order enquiries: your order number and what you would like us to do.",
        "Sizing and fit: the piece you are looking at and, if you have one, the internal diameter of something that already fits.",
        "Commissions: what you have in mind, any budget you want to work within, and the date it is needed by.",
        "Returns and exchanges: your order number and whether you want a refund or a replacement.",
      ],
    },
    {
      heading: "When you will hear back",
      body: [
        "We answer messages on working days, usually within one working day. Enquiries that need the workshop to check something — stone availability, whether a design can be resized — can take a little longer, and we will say so rather than leave you waiting without explanation.",
      ],
    },
    {
      heading: "Press and partnerships",
      body: [
        "For press enquiries, stockist proposals or collaborations, use the same address and mark your message for the attention of the founders. We read all of them, though we take on very few.",
      ],
    },
  ],
};
