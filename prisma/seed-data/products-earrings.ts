// Available earring images from assets folder
export const earringImages = [
  "134_697227d8-6bcb-4f80-8562-de9b7ef3857b.jpg.jpeg",
  "135_2bd87bbc-5fad-4e0b-af2f-cb7b7b5564f1.jpg.jpeg",
  "151_6.jpg.jpeg",
  "41_5c54b033-e895-4455-bfdb-ae5fc0f3f35c.jpg.jpeg",
  "54_e9aa498c-58a5-45fc-841e-e795bb0fb089.jpg.jpeg",
  "Anti_tarnish_Earring_1080x.webp.jpeg",
  "ESTL4225_8ce2437e-4893-46d1-adc7-05245f3df2f9.jpg.jpeg",
  "Pic-resize-Estailo-2023-04-24T160244.395.jpg.jpeg",
  "Pic-resize-Estailo-9_1cbd9704-83d0-40b2-a4c4-ea50559ab283.jpg.jpeg",
  "Picresize-Estailo-2023-06-22T113053.970.jpg.jpeg",
  "Picresize-Estailo-2023-06-23T122714.055-Copy.jpg.jpeg",
  "Picresize-Estailo-2023-06-23T124617.208_2ac0cc6c-8e08-486f-8f9e-57bd4d742077.jpg.jpeg",
  "Picresize-Estailo-2023-07-29T124045.267.jpg.jpeg",
  "Picresize-Estailo-2023-08-10T145937.577.jpg.jpeg",
  "Picresize-Estailo_1080x1080px_-2024-03-03T211816.271_3c731394-11ca-4be3-af5e-3850805f9722.jpg.jpeg",
  "Picresize-Estailo_1080x1080px_-2024-03-03T214513.698_8bdfd822-066c-4236-a9b0-423aea6dde9a.jpg.jpeg",
  "Picresize-Estailo_1080x1080px_-2024-03-22T214050.345_110c6e81-7239-4814-9ba3-3aaa825f41b0.jpg.jpeg",
  "Untitleddesign_61_43bb127f-576e-4a5d-bbc1-8983ea104e98.jpg.jpeg",
  "Untitleddesign_7_a4a0328f-bf0d-452b-ae16-6a4b21d51d08.jpg.jpeg",
  "Untitled_design_-_2024-12-30T124712.546.jpg.jpeg",
  "Untitled_design_-_2024-12-30T130029.316.jpg.jpeg",
  "Untitled_design_33_7e206cef-2dc3-4f79-abf0-66d83b57fdcb.jpg.jpeg",
  "Untitled_design_81_ef9eba31-a197-437e-acfd-0dc80662a4f3.jpg.jpeg",
];

export const earrings = [
  {
    name: "Traditional Gold Jhumka Earrings",
    description:
      "Elegant gold jhumka earrings with intricate traditional Indian designs and delicate pearl drops. Perfect for weddings and special occasions.",
    priceCents: 249900, // ₹2,499
    compareAtCents: 329900, // ₹3,299
    images: [earringImages[0], earringImages[1], earringImages[2]],
    isFeatured: true,
    variants: [
      {
        name: "Gold Plated - Small",
        color: "Gold",
        size: "Small",
        material: "Gold Plated Brass",
        stock: 15,
      },
      {
        name: "Gold Plated - Medium",
        color: "Gold",
        size: "Medium",
        material: "Gold Plated Brass",
        stock: 20,
      },
      {
        name: "Gold Plated - Large",
        color: "Gold",
        size: "Large",
        material: "Gold Plated Brass",
        stock: 10,
      },
    ],
  },
  {
    name: "Silver Hoop Earrings",
    description:
      "Modern silver hoop earrings with a contemporary twist on traditional designs. Lightweight and comfortable for all-day wear.",
    priceCents: 149900, // ₹1,499
    compareAtCents: null,
    images: [earringImages[3], earringImages[4], earringImages[5]],
    isFeatured: false,
    variants: [
      {
        name: "Silver - Small (2cm)",
        color: "Silver",
        size: "Small",
        material: "Sterling Silver",
        stock: 25,
      },
      {
        name: "Silver - Medium (3cm)",
        color: "Silver",
        size: "Medium",
        material: "Sterling Silver",
        stock: 30,
      },
      {
        name: "Silver - Large (4cm)",
        color: "Silver",
        size: "Large",
        material: "Sterling Silver",
        stock: 18,
      },
    ],
  },
  {
    name: "Rose Gold Stud Earrings",
    description:
      "Delicate rose gold stud earrings with sparkling cubic zirconia stones. Perfect for everyday wear and professional settings.",
    priceCents: 179900, // ₹1,799
    compareAtCents: 229900, // ₹2,299
    images: [earringImages[6], earringImages[7], earringImages[8]],
    isFeatured: true,
    variants: [
      {
        name: "Rose Gold - Standard",
        color: "Rose Gold",
        size: "Standard",
        material: "Rose Gold Plated with CZ",
        stock: 35,
      },
    ],
  },
  {
    name: "Antique Gold Drop Earrings",
    description:
      "Vintage-inspired drop earrings with antique gold finish and intricate meenakari work. A statement piece for traditional events.",
    priceCents: 319900, // ₹3,199
    compareAtCents: 399900, // ₹3,999
    images: [earringImages[9], earringImages[10], earringImages[11]],
    isFeatured: false,
    variants: [
      {
        name: "Antique Gold - Medium",
        color: "Antique Gold",
        size: "Medium",
        material: "Antique Gold Plated",
        stock: 12,
      },
      {
        name: "Antique Gold - Large",
        color: "Antique Gold",
        size: "Large",
        material: "Antique Gold Plated",
        stock: 8,
      },
    ],
  },
  {
    name: "Pearl Drop Earrings",
    description:
      "Elegant pearl drop earrings with silver settings. Fresh water pearls combine traditional elegance with modern style.",
    priceCents: 279900, // ₹2,799
    compareAtCents: null,
    images: [earringImages[12], earringImages[13], earringImages[14]],
    isFeatured: true,
    variants: [
      {
        name: "White Pearl",
        color: "White",
        size: "Medium",
        material: "Silver with Fresh Water Pearl",
        stock: 20,
      },
      {
        name: "Cream Pearl",
        color: "Cream",
        size: "Medium",
        material: "Silver with Fresh Water Pearl",
        stock: 15,
      },
    ],
  },
  {
    name: "Chandbali Earrings",
    description:
      "Classic chandbali earrings with traditional crescent moon design and kundan work. A timeless piece for Indian weddings.",
    priceCents: 349900, // ₹3,499
    compareAtCents: 449900, // ₹4,499
    images: [earringImages[15], earringImages[16], earringImages[17]],
    isFeatured: false,
    variants: [
      {
        name: "Gold with Kundan",
        color: "Gold",
        size: "Large",
        material: "Gold Plated with Kundan",
        stock: 10,
      },
    ],
  },
  {
    name: "Diamond-Like Stud Set",
    description:
      "Set of 3 pairs of stud earrings with diamond-like cubic zirconia in different sizes. Versatile and elegant.",
    priceCents: 199900, // ₹1,999
    compareAtCents: 259900, // ₹2,599
    images: [earringImages[18], earringImages[19], earringImages[20]],
    isFeatured: true,
    variants: [
      {
        name: "Silver Set of 3",
        color: "Silver",
        size: "Multi",
        material: "Sterling Silver with CZ",
        stock: 25,
      },
      {
        name: "Gold Set of 3",
        color: "Gold",
        size: "Multi",
        material: "Gold Plated with CZ",
        stock: 22,
      },
    ],
  },
  {
    name: "Tassel Earrings",
    description:
      "Trendy tassel earrings with colorful threads and gold accents. Modern and playful design for casual occasions.",
    priceCents: 129900, // ₹1,299
    compareAtCents: null,
    images: [earringImages[21], earringImages[22], earringImages[0]],
    isFeatured: false,
    variants: [
      {
        name: "Multi Color - Gold",
        color: "Multi",
        size: "Long",
        material: "Gold Plated with Thread",
        stock: 18,
      },
      {
        name: "Black - Gold",
        color: "Black",
        size: "Long",
        material: "Gold Plated with Thread",
        stock: 16,
      },
      {
        name: "Red - Gold",
        color: "Red",
        size: "Long",
        material: "Gold Plated with Thread",
        stock: 14,
      },
    ],
  },
];
