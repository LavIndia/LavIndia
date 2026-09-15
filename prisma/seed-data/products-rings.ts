// Available ring images from assets folder
export const ringImages = [
  "100_7ff6ea3e-945c-4211-9b0f-885b430f14ac.jpg.jpeg",
  "11.3.webp.jpeg",
  "153_3.jpg.jpeg",
  "99_1b4f5831-0303-4fa2-af46-e9d78e3d6798.jpg.jpeg",
  "IMG_3013.jpg.jpeg",
  "IMG_3019.jpg.jpeg",
  "IMG_3083.jpg.jpeg",
  "IMG_3092_d3ff4d88-456b-4c31-94cf-116fcc11f916.jpg.jpeg",
  "IMG_3099-Copy.jpg.jpeg",
  "IMG_3107.jpg.jpeg",
  "IMG_3131.jpg.jpeg",
  "IMG_3212.jpg.jpeg",
  "IMG_3358.jpg.jpeg",
  "IMG_3362.jpg.jpeg",
  "IMG_3390.jpg.jpeg",
  "IMG_4305.jpg.jpeg",
  "IMG_4335.jpg.jpeg",
  "IMG_4339.jpg.jpeg",
  "IMG_4414_1.jpg.jpeg",
  "IMG_4433.jpg.jpeg",
  "Picresize-Estailo-2023-07-21T164308.366.jpg.jpeg",
  "Untitleddesign-2025-03-13T114440.766.jpg.jpeg",
  "Untitled_design_-_2025-08-04T145911.697.jpg.jpeg",
];

export const rings = [
  {
    name: "Gold Band Ring",
    description:
      "Classic gold band ring with intricate Indian design patterns and comfortable fit. Perfect for daily wear and special occasions.",
    priceCents: 149900, // ₹1,499
    compareAtCents: 199900, // ₹1,999
    images: [ringImages[0], ringImages[1], ringImages[2]],
    isFeatured: true,
    variants: [
      {
        name: "Gold - Size 6",
        color: "Gold",
        size: "6",
        material: "Gold Plated Brass",
        stock: 10,
      },
      {
        name: "Gold - Size 7",
        color: "Gold",
        size: "7",
        material: "Gold Plated Brass",
        stock: 15,
      },
      {
        name: "Gold - Size 8",
        color: "Gold",
        size: "8",
        material: "Gold Plated Brass",
        stock: 12,
      },
      {
        name: "Gold - Size 9",
        color: "Gold",
        size: "9",
        material: "Gold Plated Brass",
        stock: 8,
      },
    ],
  },
  {
    name: "Silver Statement Ring",
    description:
      "Bold silver statement ring with traditional Indian motifs and oxidized finish. Makes a strong style statement.",
    priceCents: 119900, // ₹1,199
    compareAtCents: null,
    images: [ringImages[3], ringImages[4], ringImages[5]],
    isFeatured: false,
    variants: [
      {
        name: "Silver - Size 6",
        color: "Silver",
        size: "6",
        material: "Sterling Silver",
        stock: 18,
      },
      {
        name: "Silver - Size 7",
        color: "Silver",
        size: "7",
        material: "Sterling Silver",
        stock: 22,
      },
      {
        name: "Silver - Size 8",
        color: "Silver",
        size: "8",
        material: "Sterling Silver",
        stock: 20,
      },
      {
        name: "Silver - Size 9",
        color: "Silver",
        size: "9",
        material: "Sterling Silver",
        stock: 14,
      },
    ],
  },
  {
    name: "Rose Gold Cocktail Ring",
    description:
      "Elegant rose gold cocktail ring with cubic zirconia stones. Perfect for parties and evening wear.",
    priceCents: 249900, // ₹2,499
    compareAtCents: 329900, // ₹3,299
    images: [ringImages[6], ringImages[7], ringImages[8]],
    isFeatured: true,
    variants: [
      {
        name: "Rose Gold - Size 6",
        color: "Rose Gold",
        size: "6",
        material: "Rose Gold Plated with CZ",
        stock: 12,
      },
      {
        name: "Rose Gold - Size 7",
        color: "Rose Gold",
        size: "7",
        material: "Rose Gold Plated with CZ",
        stock: 15,
      },
      {
        name: "Rose Gold - Size 8",
        color: "Rose Gold",
        size: "8",
        material: "Rose Gold Plated with CZ",
        stock: 10,
      },
    ],
  },
  {
    name: "Diamond Cut Engagement Ring",
    description:
      "Beautiful engagement ring with diamond-cut cubic zirconia center stone. Traditional design meets modern elegance.",
    priceCents: 349900, // ₹3,499
    compareAtCents: 449900, // ₹4,499
    images: [ringImages[9], ringImages[10], ringImages[11]],
    isFeatured: false,
    variants: [
      {
        name: "Gold - Size 5",
        color: "Gold",
        size: "5",
        material: "Gold Plated with CZ",
        stock: 5,
      },
      {
        name: "Gold - Size 6",
        color: "Gold",
        size: "6",
        material: "Gold Plated with CZ",
        stock: 8,
      },
      {
        name: "Gold - Size 7",
        color: "Gold",
        size: "7",
        material: "Gold Plated with CZ",
        stock: 10,
      },
      {
        name: "Platinum - Size 6",
        color: "Platinum",
        size: "6",
        material: "Platinum Plated with CZ",
        stock: 6,
      },
    ],
  },
  {
    name: "Stackable Rings Set",
    description:
      "Set of three stackable rings in silver with complementary traditional designs. Mix and match for versatile styling.",
    priceCents: 179900, // ₹1,799
    compareAtCents: 239900, // ₹2,399
    images: [ringImages[12], ringImages[13], ringImages[14]],
    isFeatured: true,
    variants: [
      {
        name: "Silver Set - Size 6",
        color: "Silver",
        size: "6",
        material: "Sterling Silver",
        stock: 25,
      },
      {
        name: "Silver Set - Size 7",
        color: "Silver",
        size: "7",
        material: "Sterling Silver",
        stock: 28,
      },
      {
        name: "Silver Set - Size 8",
        color: "Silver",
        size: "8",
        material: "Sterling Silver",
        stock: 22,
      },
      {
        name: "Gold Set - Size 7",
        color: "Gold",
        size: "7",
        material: "Gold Plated",
        stock: 18,
      },
    ],
  },
  {
    name: "Kundan Work Ring",
    description:
      "Traditional kundan work ring with intricate stone setting. A piece of Indian heritage jewelry.",
    priceCents: 279900, // ₹2,799
    compareAtCents: null,
    images: [ringImages[15], ringImages[16], ringImages[17]],
    isFeatured: false,
    variants: [
      {
        name: "Gold Kundan - Size 6",
        color: "Gold",
        size: "6",
        material: "Gold Plated with Kundan",
        stock: 10,
      },
      {
        name: "Gold Kundan - Size 7",
        color: "Gold",
        size: "7",
        material: "Gold Plated with Kundan",
        stock: 12,
      },
      {
        name: "Gold Kundan - Size 8",
        color: "Gold",
        size: "8",
        material: "Gold Plated with Kundan",
        stock: 8,
      },
    ],
  },
  {
    name: "Adjustable Toe Ring Set",
    description:
      "Traditional toe ring set in silver with adjustable sizing. Perfect for Indian weddings and festivals.",
    priceCents: 89900, // ₹899
    compareAtCents: null,
    images: [ringImages[18], ringImages[19], ringImages[20]],
    isFeatured: false,
    variants: [
      {
        name: "Silver Set of 2",
        color: "Silver",
        size: "Adjustable",
        material: "Sterling Silver",
        stock: 35,
      },
      {
        name: "Silver Set of 4",
        color: "Silver",
        size: "Adjustable",
        material: "Sterling Silver",
        stock: 28,
      },
    ],
  },
  {
    name: "Antique Thumb Ring",
    description:
      "Bold antique finish thumb ring with traditional motifs. Statement piece for cultural events.",
    priceCents: 139900, // ₹1,399
    compareAtCents: 179900, // ₹1,799
    images: [ringImages[21], ringImages[22], ringImages[0]],
    isFeatured: false,
    variants: [
      {
        name: "Antique Gold - Size 9",
        color: "Antique Gold",
        size: "9",
        material: "Antique Gold Plated",
        stock: 15,
      },
      {
        name: "Antique Gold - Size 10",
        color: "Antique Gold",
        size: "10",
        material: "Antique Gold Plated",
        stock: 12,
      },
      {
        name: "Antique Silver - Size 9",
        color: "Antique Silver",
        size: "9",
        material: "Oxidized Silver",
        stock: 14,
      },
    ],
  },
  {
    name: "Pearl Cluster Ring",
    description:
      "Delicate ring with fresh water pearl cluster. Feminine and elegant design for special occasions.",
    priceCents: 199900, // ₹1,999
    compareAtCents: 259900, // ₹2,599
    images: [ringImages[1], ringImages[3], ringImages[5]],
    isFeatured: true,
    variants: [
      {
        name: "Gold with White Pearl - Size 6",
        color: "Gold",
        size: "6",
        material: "Gold Plated with Pearl",
        stock: 14,
      },
      {
        name: "Gold with White Pearl - Size 7",
        color: "Gold",
        size: "7",
        material: "Gold Plated with Pearl",
        stock: 16,
      },
      {
        name: "Silver with White Pearl - Size 7",
        color: "Silver",
        size: "7",
        material: "Sterling Silver with Pearl",
        stock: 12,
      },
    ],
  },
  {
    name: "Midi Ring Set",
    description:
      "Trendy midi ring set of 5 rings in mixed designs. Perfect for creating layered looks.",
    priceCents: 129900, // ₹1,299
    compareAtCents: null,
    images: [ringImages[7], ringImages[9], ringImages[11]],
    isFeatured: false,
    variants: [
      {
        name: "Gold Mix Set",
        color: "Gold",
        size: "Multi",
        material: "Gold Plated",
        stock: 20,
      },
      {
        name: "Silver Mix Set",
        color: "Silver",
        size: "Multi",
        material: "Sterling Silver",
        stock: 22,
      },
      {
        name: "Rose Gold Mix Set",
        color: "Rose Gold",
        size: "Multi",
        material: "Rose Gold Plated",
        stock: 18,
      },
    ],
  },
];
