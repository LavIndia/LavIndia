import type { ContentPageCopy } from "@/modules/marketing";

export const privacyPolicyCopy: ContentPageCopy = {
  title: "Privacy Policy",
  intro:
    "What we collect when you use this site, why we collect it, and what you can ask us to do with it.",
  lastUpdated: "20 September 2026",
  sections: [
    {
      heading: "What we collect",
      body: [
        "We collect only what an order or an account actually requires. That falls into three groups: what you tell us, what your order generates, and what your browser reports while you are on the site.",
      ],
      bullets: [
        "Account details: your name, email address, and — if you choose to sign in that way — the basic profile your identity provider returns.",
        "Order details: delivery and billing addresses, contact number, the items ordered and their prices.",
        "Payment details: handled entirely by our payment provider. We receive confirmation of the outcome and a reference, never your full card number.",
        "Technical details: pages viewed, approximate location derived from your connection, device and browser type, and the sign-in events on your account.",
      ],
    },
    {
      heading: "Why we hold it",
      bullets: [
        "To take, fulfil, deliver and invoice your order, which is the contract between us.",
        "To operate your account, including your saved addresses and wishlist.",
        "To meet tax, accounting and consumer-protection obligations that require us to retain records.",
        "To keep the site secure and to investigate fraudulent or abusive use.",
        "To send marketing email, but only where you have subscribed, and only until you unsubscribe.",
      ],
    },
    {
      heading: "Who we share it with",
      body: [
        "We do not sell personal data, and we do not share it for anyone else's advertising. We do share the minimum necessary with the companies that make the service work: our payment provider, our delivery partners, our hosting and database providers, our image hosting service, and our email provider.",
        "We may also disclose information where the law requires it, or where it is necessary to establish or defend a legal claim.",
      ],
    },
    {
      heading: "How long we keep it",
      body: [
        "Order and invoice records are kept for as long as tax and accounting law requires. Account information is kept while your account is open. Marketing consent records are kept until you withdraw consent, and then for a short period afterwards so that we can prove the request was honoured.",
      ],
    },
    {
      heading: "Your rights",
      body: [
        "You can ask us for a copy of the personal data we hold about you, ask us to correct it if it is wrong, ask us to delete it where we are not required to keep it, or withdraw consent to marketing at any time.",
        "Write to us using the details on our contact page and we will respond. If you are not satisfied with our response, you are entitled to complain to the relevant data protection authority.",
      ],
    },
    {
      heading: "Cookies and similar technologies",
      body: [
        "We use cookies to keep you signed in, to remember the contents of your basket, and to understand which pages are used so that we can improve them. You can block or delete cookies in your browser, but parts of the site — signing in and checking out in particular — will not work without them.",
      ],
    },
    {
      heading: "Changes to this policy",
      body: [
        "If we change this policy we will update the date shown above. Where a change materially affects your rights, we will tell you directly rather than rely on you noticing.",
      ],
    },
  ],
};
