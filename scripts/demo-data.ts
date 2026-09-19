/**
 * Content for the demo dataset.
 *
 * Kept apart from the script that writes it so the data can be reviewed and
 * edited without reading any logic. The point of this dataset is that every
 * admin screen and every storefront surface has something real to render —
 * orders in several states, customers with addresses, engagement to chart —
 * rather than each one showing an empty state.
 */

export interface DemoCustomer {
  username: string;
  name: string;
  email: string;
  mobile: string;
  address: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
  };
}

export const DEMO_PASSWORD = "customer123";

export const DEMO_CUSTOMERS: DemoCustomer[] = [
  {
    username: "ananya.rao",
    name: "Ananya Rao",
    email: "ananya.rao@example.com",
    mobile: "9845012301",
    address: {
      addressLine1: "12 Sankey Road",
      addressLine2: "Sadashivanagar",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560080",
    },
  },
  {
    username: "meera.iyer",
    name: "Meera Iyer",
    email: "meera.iyer@example.com",
    mobile: "9840012302",
    address: {
      addressLine1: "45 Boat Club Road",
      city: "Chennai",
      state: "Tamil Nadu",
      pincode: "600028",
    },
  },
  {
    username: "rhea.kapoor",
    name: "Rhea Kapoor",
    email: "rhea.kapoor@example.com",
    mobile: "9820012303",
    address: {
      addressLine1: "7 Altamount Road",
      addressLine2: "Cumballa Hill",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400026",
    },
  },
  {
    username: "sara.menon",
    name: "Sara Menon",
    email: "sara.menon@example.com",
    mobile: "9847012304",
    address: {
      addressLine1: "22 Panampilly Nagar",
      city: "Kochi",
      state: "Kerala",
      pincode: "682036",
    },
  },
  {
    username: "divya.reddy",
    name: "Divya Reddy",
    email: "divya.reddy@example.com",
    mobile: "9848012305",
    address: {
      addressLine1: "9 Road No. 12",
      addressLine2: "Banjara Hills",
      city: "Hyderabad",
      state: "Telangana",
      pincode: "500034",
    },
  },
];

export type DemoOrderStatus =
  | "PENDING"
  | "PROCESSING"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export interface DemoOrder {
  /** Index into DEMO_CUSTOMERS. */
  customer: number;
  /** Product slugs with the quantity bought. */
  lines: { slug: string; quantity: number }[];
  status: DemoOrderStatus;
  paymentStatus: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
  paymentMethod: "razorpay" | "cod";
  /** Days before today the order was placed, so charts have a spread. */
  daysAgo: number;
  discountCode?: string;
}

/**
 * A spread across statuses, payment methods and dates, so the orders table,
 * the dashboard totals and the analytics charts all have variety to show.
 */
export const DEMO_ORDERS: DemoOrder[] = [
  {
    customer: 0,
    lines: [{ slug: "onyx-tablet-pendant-necklace", quantity: 1 }],
    status: "DELIVERED",
    paymentStatus: "COMPLETED",
    paymentMethod: "razorpay",
    daysAgo: 24,
  },
  {
    customer: 1,
    lines: [
      { slug: "celestial-sun-and-moon-pendant", quantity: 1 },
      { slug: "layered-butterfly-necklace", quantity: 1 },
    ],
    status: "DELIVERED",
    paymentStatus: "COMPLETED",
    paymentMethod: "razorpay",
    daysAgo: 19,
    discountCode: "WELCOME10",
  },
  {
    customer: 2,
    lines: [{ slug: "molten-drop-collar", quantity: 1 }],
    status: "DELIVERED",
    paymentStatus: "COMPLETED",
    paymentMethod: "cod",
    daysAgo: 15,
  },
  {
    customer: 3,
    lines: [{ slug: "puffed-heart-station-necklace", quantity: 2 }],
    status: "SHIPPED",
    paymentStatus: "COMPLETED",
    paymentMethod: "razorpay",
    daysAgo: 8,
  },
  {
    customer: 4,
    lines: [{ slug: "onyx-tablet-pendant-necklace", quantity: 1 }],
    status: "OUT_FOR_DELIVERY",
    paymentStatus: "COMPLETED",
    paymentMethod: "razorpay",
    daysAgo: 5,
  },
  {
    customer: 0,
    lines: [{ slug: "celestial-sun-and-moon-pendant", quantity: 1 }],
    status: "PROCESSING",
    paymentStatus: "COMPLETED",
    paymentMethod: "cod",
    daysAgo: 3,
  },
  {
    customer: 1,
    lines: [{ slug: "layered-butterfly-necklace", quantity: 1 }],
    status: "PENDING",
    paymentStatus: "PENDING",
    paymentMethod: "razorpay",
    daysAgo: 1,
  },
  // A cancelled order, so that state is represented and its stock is
  // returned rather than silently lost.
  {
    customer: 2,
    lines: [{ slug: "puffed-heart-station-necklace", quantity: 1 }],
    status: "CANCELLED",
    paymentStatus: "FAILED",
    paymentMethod: "razorpay",
    daysAgo: 6,
  },
];

export const DEMO_DISCOUNTS = [
  {
    code: "WELCOME10",
    title: "Welcome offer",
    description: "10% off a first order.",
    discountType: "PERCENTAGE",
    discountValue: 10,
    minPurchase: 100000,
    maxDiscount: 50000,
    usageLimit: 500,
  },
  {
    code: "FESTIVE500",
    title: "Festive ₹500 off",
    description: "Flat ₹500 off orders above ₹3,000.",
    discountType: "FIXED_AMOUNT",
    discountValue: 50000,
    minPurchase: 300000,
    usageLimit: 200,
  },
];

export const DEMO_NEWSLETTER = [
  "ananya.rao@example.com",
  "meera.iyer@example.com",
  "priya.nair@example.com",
  "tanvi.shah@example.com",
  "ishita.bose@example.com",
];
