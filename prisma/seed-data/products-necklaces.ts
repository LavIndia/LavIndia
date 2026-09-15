// Available necklace images from assets folder
export const necklaceImages = [
  "12_aba56d94-410a-4679-9bb7-0b8c9122b903.jpg.jpeg",
  "16_a94e1fb4-7dbc-4a67-b64f-1366fe0ec967.jpg.jpeg",
  "1_1_4c720205-d49a-4e6b-8a29-b80b95829124.jpg.jpeg",
  "27_428459a9-fa62-461a-b555-f5dc3f7b7eb5.jpg.jpeg",
  "29_95b33258-caaf-48d5-80c3-8246b6fe6705.jpg.jpeg",
  "4_1626429b-917a-4f6f-9fdc-350f4a3cbed1.jpg.jpeg",
  "4_e4bc3053-d26d-450e-bcba-62b1a27c908f.jpg.jpeg",
  "7_b4c08463-a3f9-48c3-aaa0-c8ba1b8e08ff.jpg.jpeg",
  "Don_tLeafMeHoopsEarrings-2024-07-06T141030.820_ca1d4000-f119-4c3e-bc58-33b11cb47fd0.jpg.jpeg",
  "Don_tLeafMeHoopsEarrings-2024-07-28T220251.102_f0a86e48-e8e3-402b-874b-2fa7187ed6a1.jpg.jpeg",
  "Don_tLeafMeHoopsEarrings-2024-07-28T224705.983_3674f4d7-ac17-4db4-bbc0-eed964a01e88.jpg.jpeg",
  "ESTL6712.jpg.jpeg",
  "forwebsite-2024-09-25T154520.752_06ff7a80-9dc6-4f0e-9784-225fa2be047d.jpg.jpeg",
  "forwebsite-2024-09-25T154553.200.jpg.jpeg",
  "forwebsite-2024-09-29T211455.323.jpg.jpeg",
  "forwebsite-2024-10-25T153056.181_d0f3968a-a373-4531-82d4-ae201185b70d.jpg.jpeg",
  "forwebsite-2024-10-25T153105.730.jpg.jpeg",
  "forwebsite-2024-10-28T222445.152.jpg.jpeg",
  "Picresize-Estailo_1080x1080px_-2023-10-04T191802.106.jpg.jpeg",
  "Picresize-Estailo_1080x1080px_-2024-02-22T225721.328.jpg.jpeg",
  "Picresize-Estailo_1080x1080px_-2024-03-03T234443.901.jpg.jpeg",
  "Picresize-Estailo_1080x1080px_-2024-03-03T234450.781_698f8bbe-5ac7-4ef3-8082-179506bce4c0.jpg.jpeg",
  "Untitleddesign-2024-11-25T220303.936.jpg.jpeg",
  "Untitleddesign_64_7116460c-48e2-4068-b10c-2e7b70e52372.jpg.jpeg",
  "Untitleddesign_66_8c40b1af-0dd3-4ae6-ba58-e900421098b3.jpg.jpeg",
  "Untitled_design_-_2025-07-29T152406.635.jpg.jpeg",
  "Untitled_design_-_2025-07-29T152413.479.jpg.jpeg",
  "Untitled_design_-_2025-07-29T152420.001.jpg.jpeg",
  "Untitled_design_-_2025-07-29T152529.151.jpg.jpeg",
  "Untitled_design_-_2025-07-29T170909.856.jpg.jpeg",
  "Untitled_design_-_2025-07-29T171446.268.jpg.jpeg",
  "Untitled_design_-_2025-07-29T171452.690.jpg.jpeg",
  "Untitled_design_-_2025-07-29T181411.242.jpg.jpeg",
  "Untitled_design_-_2025-08-01T124009.066.jpg.jpeg",
  "Untitled_design_-_2025-08-04T141747.058.jpg.jpeg",
  "Untitled_design_-_2025-08-04T143904.265.jpg.jpeg",
];

export const necklaces = [
  {
    name: "Gold Chain Necklace",
    description:
      "Classic gold chain necklace with delicate links and adjustable length. Perfect for layering or standalone wear with traditional and modern outfits.",
    priceCents: 449900, // ₹4,499
    compareAtCents: 599900, // ₹5,999
    images: [necklaceImages[0], necklaceImages[1], necklaceImages[2]],
    isFeatured: true,
    variants: [
      {
        name: "Gold - 16 inch",
        color: "Gold",
        size: "16 inch",
        material: "Gold Plated Brass",
        stock: 12,
      },
      {
        name: "Gold - 18 inch",
        color: "Gold",
        size: "18 inch",
        material: "Gold Plated Brass",
        stock: 18,
      },
      {
        name: "Gold - 20 inch",
        color: "Gold",
        size: "20 inch",
        material: "Gold Plated Brass",
        stock: 10,
      },
    ],
  },
  {
    name: "Silver Pendant Necklace",
    description:
      "Elegant silver necklace with a beautiful pendant featuring traditional Indian motifs. Oxidized finish adds vintage charm.",
    priceCents: 219900, // ₹2,199
    compareAtCents: null,
    images: [necklaceImages[3], necklaceImages[4], necklaceImages[5]],
    isFeatured: false,
    variants: [
      {
        name: "Silver - Small Pendant",
        color: "Silver",
        size: "Small",
        material: "Sterling Silver",
        stock: 20,
      },
      {
        name: "Silver - Medium Pendant",
        color: "Silver",
        size: "Medium",
        material: "Sterling Silver",
        stock: 25,
      },
      {
        name: "Silver - Large Pendant",
        color: "Silver",
        size: "Large",
        material: "Sterling Silver",
        stock: 15,
      },
    ],
  },
  {
    name: "Rose Gold Beaded Necklace",
    description:
      "Stunning rose gold necklace with handcrafted beads and traditional Indian craftsmanship. Lightweight and comfortable.",
    priceCents: 349900, // ₹3,499
    compareAtCents: 449900, // ₹4,499
    images: [necklaceImages[6], necklaceImages[7], necklaceImages[8]],
    isFeatured: true,
    variants: [
      {
        name: "Rose Gold - 18 inch",
        color: "Rose Gold",
        size: "18 inch",
        material: "Rose Gold Plated",
        stock: 16,
      },
      {
        name: "Rose Gold - 20 inch",
        color: "Rose Gold",
        size: "20 inch",
        material: "Rose Gold Plated",
        stock: 12,
      },
    ],
  },
  {
    name: "Traditional Mangalsutra",
    description:
      "Authentic mangalsutra with black beads and gold accents, symbolizing marital bliss. Modern design meets traditional values.",
    priceCents: 179900, // ₹1,799
    compareAtCents: null,
    images: [necklaceImages[9], necklaceImages[10], necklaceImages[11]],
    isFeatured: false,
    variants: [
      {
        name: "Single Line - Gold Accents",
        color: "Gold/Black",
        size: "Standard",
        material: "Gold Plated with Beads",
        stock: 30,
      },
      {
        name: "Double Line - Gold Accents",
        color: "Gold/Black",
        size: "Long",
        material: "Gold Plated with Beads",
        stock: 25,
      },
    ],
  },
  {
    name: "Layered Silver Necklace",
    description:
      "Modern layered silver necklace combining different lengths and traditional coin designs. Trendy and versatile.",
    priceCents: 279900, // ₹2,799
    compareAtCents: 349900, // ₹3,499
    images: [necklaceImages[12], necklaceImages[13], necklaceImages[14]],
    isFeatured: true,
    variants: [
      {
        name: "Silver 3-Layer",
        color: "Silver",
        size: "Multi-length",
        material: "Sterling Silver",
        stock: 20,
      },
    ],
  },
  {
    name: "Temple Jewelry Necklace",
    description:
      "Grand temple jewelry necklace with goddess motifs and intricate detailing. Perfect for weddings and festive occasions.",
    priceCents: 549900, // ₹5,499
    compareAtCents: 699900, // ₹6,999
    images: [necklaceImages[15], necklaceImages[16], necklaceImages[17]],
    isFeatured: false,
    variants: [
      {
        name: "Antique Gold - Standard",
        color: "Antique Gold",
        size: "Standard",
        material: "Antique Gold Plated",
        stock: 8,
      },
      {
        name: "Gold - Standard",
        color: "Gold",
        size: "Standard",
        material: "Gold Plated",
        stock: 10,
      },
    ],
  },
  {
    name: "Choker Necklace Set",
    description:
      "Bridal choker necklace set with kundan work and pearl drops. Comes with matching earrings for a complete look.",
    priceCents: 649900, // ₹6,499
    compareAtCents: 849900, // ₹8,499
    images: [necklaceImages[18], necklaceImages[19], necklaceImages[20]],
    isFeatured: true,
    variants: [
      {
        name: "Gold with Kundan",
        color: "Gold",
        size: "Choker",
        material: "Gold Plated with Kundan",
        stock: 6,
      },
    ],
  },
  {
    name: "Long Rani Haar",
    description:
      "Traditional long rani haar with intricate gold work and semi-precious stones. A royal piece for special occasions.",
    priceCents: 749900, // ₹7,499
    compareAtCents: 999900, // ₹9,999
    images: [necklaceImages[21], necklaceImages[22], necklaceImages[23]],
    isFeatured: false,
    variants: [
      {
        name: "Gold - 24 inch",
        color: "Gold",
        size: "Long",
        material: "Gold Plated with Stones",
        stock: 5,
      },
    ],
  },
  {
    name: "Pearl String Necklace",
    description:
      "Classic pearl string necklace with fresh water pearls. Timeless elegance for formal occasions and parties.",
    priceCents: 329900, // ₹3,299
    compareAtCents: null,
    images: [necklaceImages[24], necklaceImages[25], necklaceImages[26]],
    isFeatured: true,
    variants: [
      {
        name: "White Pearl - 16 inch",
        color: "White",
        size: "16 inch",
        material: "Fresh Water Pearl",
        stock: 14,
      },
      {
        name: "White Pearl - 18 inch",
        color: "White",
        size: "18 inch",
        material: "Fresh Water Pearl",
        stock: 12,
      },
      {
        name: "Cream Pearl - 16 inch",
        color: "Cream",
        size: "16 inch",
        material: "Fresh Water Pearl",
        stock: 10,
      },
    ],
  },
  {
    name: "Minimalist Bar Necklace",
    description:
      "Modern minimalist bar necklace with sleek design. Perfect for everyday wear and professional settings.",
    priceCents: 149900, // ₹1,499
    compareAtCents: 199900, // ₹1,999
    images: [necklaceImages[27], necklaceImages[28], necklaceImages[29]],
    isFeatured: false,
    variants: [
      {
        name: "Gold Bar",
        color: "Gold",
        size: "Petite",
        material: "Gold Plated",
        stock: 28,
      },
      {
        name: "Silver Bar",
        color: "Silver",
        size: "Petite",
        material: "Sterling Silver",
        stock: 30,
      },
      {
        name: "Rose Gold Bar",
        color: "Rose Gold",
        size: "Petite",
        material: "Rose Gold Plated",
        stock: 25,
      },
    ],
  },
];
