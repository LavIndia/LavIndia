import { PrismaClient } from "@prisma/client";
import { promises as fs } from "fs";
import path from "path";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

interface ProductData {
  name: string;
  description: string;
  priceCents: number;
  compareAtCents?: number;
  images: string[];
  variants: Array<{
    name: string;
    color?: string;
    size?: string;
    material?: string;
    stock: number;
  }>;
}

async function getImageFiles(directory: string): Promise<string[]> {
  try {
    const files = await fs.readdir(directory);
    return files.filter(
      (file) =>
        file.endsWith(".jpg") ||
        file.endsWith(".jpeg") ||
        file.endsWith(".png") ||
        file.endsWith(".webp")
    );
  } catch (error) {
    console.error(`Error reading directory ${directory}:`, error);
    return [];
  }
}

async function createCategory(
  name: string,
  slug: string,
  description: string,
  featuredOrder: number = 0,
  image?: string
) {
  return await prisma.category.upsert({
    where: { slug },
    update: {},
    create: {
      name,
      slug,
      description,
      isFeatured: true,
      featuredOrder,
      image: image || null,
    },
  });
}

async function createProduct(
  categoryId: string,
  productData: ProductData,
  imageFiles: string[],
  categorySlug: string
) {
  const slug = `${productData.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;

  const product = await prisma.product.create({
    data: {
      name: productData.name,
      slug,
      description: productData.description,
      priceCents: productData.priceCents,
      compareAtCents: productData.compareAtCents,
      sku: `SKU-${categorySlug.toUpperCase()}-${Date.now()}`,
      isActive: true,
      isFeatured: Math.random() > 0.7, // 30% chance of being featured
      categoryId,
    },
  });

  // Create product images
  for (let i = 0; i < Math.min(imageFiles.length, 5); i++) {
    await prisma.productImage.create({
      data: {
        url: `/assets/pictures/products/${categorySlug}/${imageFiles[i]}`,
        alt: `${productData.name} - Image ${i + 1}`,
        position: i,
        isPrimary: i === 0,
        productId: product.id,
      },
    });
  }

  // Create product variants
  for (const variant of productData.variants) {
    await prisma.productVariant.create({
      data: {
        name: variant.name,
        color: variant.color,
        size: variant.size,
        material: variant.material,
        stock: variant.stock,
        isActive: true,
        productId: product.id,
      },
    });
  }

  return product;
}

async function seedEarrings() {
  console.log("Seeding earrings...");

  const category = await createCategory(
    "Earrings",
    "earrings",
    "Beautiful handcrafted earrings made with traditional Indian craftsmanship and modern designs.",
    1,
    "/assets/pictures/categories/earrings/Anti_tarnish_Earring_1080x.webp"
  );

  const imageFiles = await getImageFiles(
    path.join(process.cwd(), "public/assets/pictures/products/earrings")
  );

  const earringProducts: ProductData[] = [
    {
      name: "Traditional Gold Earrings",
      description:
        "Elegant gold earrings with intricate traditional Indian designs, perfect for weddings and special occasions.",
      priceCents: 250000, // ₹2500
      compareAtCents: 300000, // ₹3000
      images: imageFiles.slice(0, 3),
      variants: [
        {
          name: "Gold - Small",
          color: "Gold",
          size: "Small",
          material: "Gold Plated",
          stock: 10,
        },
        {
          name: "Gold - Medium",
          color: "Gold",
          size: "Medium",
          material: "Gold Plated",
          stock: 15,
        },
        {
          name: "Gold - Large",
          color: "Gold",
          size: "Large",
          material: "Gold Plated",
          stock: 8,
        },
      ],
    },
    {
      name: "Silver Hoop Earrings",
      description:
        "Modern silver hoop earrings with a contemporary twist on traditional designs.",
      priceCents: 150000, // ₹1500
      images: imageFiles.slice(3, 6),
      variants: [
        {
          name: "Silver - Small",
          color: "Silver",
          size: "Small",
          material: "Sterling Silver",
          stock: 20,
        },
        {
          name: "Silver - Medium",
          color: "Silver",
          size: "Medium",
          material: "Sterling Silver",
          stock: 18,
        },
      ],
    },
    {
      name: "Rose Gold Stud Earrings",
      description:
        "Delicate rose gold stud earrings, perfect for everyday wear and professional settings.",
      priceCents: 180000, // ₹1800
      compareAtCents: 220000, // ₹2200
      images: imageFiles.slice(6, 9),
      variants: [
        {
          name: "Rose Gold - Standard",
          color: "Rose Gold",
          size: "Standard",
          material: "Rose Gold Plated",
          stock: 25,
        },
      ],
    },
    {
      name: "Antique Gold Drop Earrings",
      description:
        "Vintage-inspired drop earrings with antique gold finish and intricate detailing.",
      priceCents: 320000, // ₹3200
      images: imageFiles.slice(9, 12),
      variants: [
        {
          name: "Antique Gold - Medium",
          color: "Antique Gold",
          size: "Medium",
          material: "Gold Plated",
          stock: 12,
        },
        {
          name: "Antique Gold - Large",
          color: "Antique Gold",
          size: "Large",
          material: "Gold Plated",
          stock: 6,
        },
      ],
    },
    {
      name: "Pearl Earrings",
      description:
        "Elegant pearl earrings with silver settings, combining traditional and modern aesthetics.",
      priceCents: 280000, // ₹2800
      images: imageFiles.slice(12, 15),
      variants: [
        {
          name: "White Pearl",
          color: "White",
          size: "Medium",
          material: "Silver with Pearl",
          stock: 14,
        },
        {
          name: "Black Pearl",
          color: "Black",
          size: "Medium",
          material: "Silver with Pearl",
          stock: 8,
        },
      ],
    },
  ];

  for (const productData of earringProducts) {
    if (productData.images.length > 0) {
      await createProduct(
        category.id,
        productData,
        productData.images,
        "earrings"
      );
    }
  }

  console.log(`Seeded ${earringProducts.length} earring products`);
}

async function seedNecklaces() {
  console.log("Seeding necklaces...");

  const category = await createCategory(
    "Necklaces",
    "necklaces",
    "Exquisite necklaces crafted with traditional Indian techniques and contemporary designs.",
    2,
    "/assets/pictures/categories/necklace/ESTL6712.jpg"
  );

  const imageFiles = await getImageFiles(
    path.join(process.cwd(), "public/assets/pictures/products/necklace")
  );

  const necklaceProducts: ProductData[] = [
    {
      name: "Gold Chain Necklace",
      description:
        "Classic gold chain necklace with delicate links, perfect for layering or standalone wear.",
      priceCents: 450000, // ₹4500
      compareAtCents: 550000, // ₹5500
      images: imageFiles.slice(0, 3),
      variants: [
        {
          name: "Gold - 16 inch",
          color: "Gold",
          size: "16 inch",
          material: "Gold Plated",
          stock: 10,
        },
        {
          name: "Gold - 18 inch",
          color: "Gold",
          size: "18 inch",
          material: "Gold Plated",
          stock: 12,
        },
        {
          name: "Gold - 20 inch",
          color: "Gold",
          size: "20 inch",
          material: "Gold Plated",
          stock: 8,
        },
      ],
    },
    {
      name: "Silver Pendant Necklace",
      description:
        "Silver necklace with a beautiful pendant featuring traditional Indian motifs.",
      priceCents: 220000, // ₹2200
      images: imageFiles.slice(3, 6),
      variants: [
        {
          name: "Silver - Small Pendant",
          color: "Silver",
          size: "Small",
          material: "Sterling Silver",
          stock: 15,
        },
        {
          name: "Silver - Medium Pendant",
          color: "Silver",
          size: "Medium",
          material: "Sterling Silver",
          stock: 18,
        },
      ],
    },
    {
      name: "Rose Gold Beaded Necklace",
      description:
        "Rose gold necklace with handcrafted beads and traditional Indian craftsmanship.",
      priceCents: 350000, // ₹3500
      images: imageFiles.slice(6, 9),
      variants: [
        {
          name: "Rose Gold - 18 inch",
          color: "Rose Gold",
          size: "18 inch",
          material: "Rose Gold Plated",
          stock: 20,
        },
      ],
    },
    {
      name: "Traditional Mangalsutra",
      description:
        "Authentic mangalsutra with black beads and gold accents, symbolizing marital bliss.",
      priceCents: 180000, // ₹1800
      images: imageFiles.slice(9, 12),
      variants: [
        {
          name: "Gold Accents",
          color: "Gold/Black",
          size: "Standard",
          material: "Gold Plated with Beads",
          stock: 25,
        },
      ],
    },
    {
      name: "Layered Silver Necklace",
      description:
        "Modern layered silver necklace combining different lengths and traditional designs.",
      priceCents: 280000, // ₹2800
      images: imageFiles.slice(12, 15),
      variants: [
        {
          name: "Silver Layered",
          color: "Silver",
          size: "Multi-length",
          material: "Sterling Silver",
          stock: 14,
        },
      ],
    },
  ];

  for (const productData of necklaceProducts) {
    if (productData.images.length > 0) {
      await createProduct(
        category.id,
        productData,
        productData.images,
        "necklace"
      );
    }
  }

  console.log(`Seeded ${necklaceProducts.length} necklace products`);
}

async function seedRings() {
  console.log("Seeding rings...");

  const category = await createCategory(
    "Rings",
    "rings",
    "Beautiful rings featuring traditional Indian designs and modern craftsmanship.",
    3,
    "/assets/pictures/categories/rings/IMG_3013.jpg"
  );

  const imageFiles = await getImageFiles(
    path.join(process.cwd(), "public/assets/pictures/products/rings")
  );

  const ringProducts: ProductData[] = [
    {
      name: "Gold Band Ring",
      description:
        "Classic gold band ring with intricate Indian design patterns.",
      priceCents: 150000, // ₹1500
      compareAtCents: 180000, // ₹1800
      images: imageFiles.slice(0, 3),
      variants: [
        {
          name: "Gold - Size 6",
          color: "Gold",
          size: "6",
          material: "Gold Plated",
          stock: 8,
        },
        {
          name: "Gold - Size 7",
          color: "Gold",
          size: "7",
          material: "Gold Plated",
          stock: 12,
        },
        {
          name: "Gold - Size 8",
          color: "Gold",
          size: "8",
          material: "Gold Plated",
          stock: 10,
        },
      ],
    },
    {
      name: "Silver Statement Ring",
      description:
        "Bold silver statement ring with traditional Indian motifs and modern appeal.",
      priceCents: 120000, // ₹1200
      images: imageFiles.slice(3, 6),
      variants: [
        {
          name: "Silver - Size 6",
          color: "Silver",
          size: "6",
          material: "Sterling Silver",
          stock: 15,
        },
        {
          name: "Silver - Size 7",
          color: "Silver",
          size: "7",
          material: "Sterling Silver",
          stock: 18,
        },
        {
          name: "Silver - Size 8",
          color: "Silver",
          size: "8",
          material: "Sterling Silver",
          stock: 14,
        },
      ],
    },
    {
      name: "Rose Gold Cocktail Ring",
      description:
        "Elegant rose gold cocktail ring perfect for special occasions and evening wear.",
      priceCents: 250000, // ₹2500
      images: imageFiles.slice(6, 9),
      variants: [
        {
          name: "Rose Gold - Size 7",
          color: "Rose Gold",
          size: "7",
          material: "Rose Gold Plated",
          stock: 10,
        },
        {
          name: "Rose Gold - Size 8",
          color: "Rose Gold",
          size: "8",
          material: "Rose Gold Plated",
          stock: 8,
        },
      ],
    },
    {
      name: "Engagement Ring",
      description:
        "Beautiful engagement ring with traditional Indian design and modern comfort.",
      priceCents: 350000, // ₹3500
      images: imageFiles.slice(9, 12),
      variants: [
        {
          name: "Gold - Size 6",
          color: "Gold",
          size: "6",
          material: "Gold Plated",
          stock: 5,
        },
        {
          name: "Gold - Size 7",
          color: "Gold",
          size: "7",
          material: "Gold Plated",
          stock: 7,
        },
      ],
    },
    {
      name: "Stackable Rings Set",
      description:
        "Set of three stackable rings in silver with complementary traditional designs.",
      priceCents: 180000, // ₹1800
      images: imageFiles.slice(12, 15),
      variants: [
        {
          name: "Silver Set - Size 6",
          color: "Silver",
          size: "6",
          material: "Sterling Silver",
          stock: 20,
        },
        {
          name: "Silver Set - Size 7",
          color: "Silver",
          size: "7",
          material: "Sterling Silver",
          stock: 18,
        },
      ],
    },
  ];

  for (const productData of ringProducts) {
    if (productData.images.length > 0) {
      await createProduct(
        category.id,
        productData,
        productData.images,
        "rings"
      );
    }
  }

  console.log(`Seeded ${ringProducts.length} ring products`);
}

async function seedHeroBanners() {
  console.log("Seeding hero banners...");

  // Delete existing hero banners
  await prisma.heroBanner.deleteMany();

  const heroBannerData = [
    {
      title: "Anti Tarnish Collection",
      subtitle: "Premium jewelry that lasts forever",
      imagePath: "/assets/pictures/herobanner/anti_tarnish_dek.jpg",
      linkUrl: "/shop",
      order: 1,
      active: true,
    },
    {
      title: "Bestseller Collection",
      subtitle: "Our most loved pieces",
      imagePath: "/assets/pictures/herobanner/bestseller-banner.jpg",
      linkUrl: "/bestsellers",
      order: 2,
      active: true,
    },
    {
      title: "Exclusive Designer Collection",
      subtitle: "Handpicked luxury pieces",
      imagePath: "/assets/pictures/herobanner/Exclusive_Banner_Desktop.jpg",
      linkUrl: "/new-arrivals",
      order: 3,
      active: true,
    },
    {
      title: "Elegant Earrings",
      subtitle: "Add sparkle to your style",
      imagePath: "/assets/pictures/herobanner/earr_desk.jpg",
      linkUrl: "/earrings",
      order: 4,
      active: true,
    },
    {
      title: "Crazy Deals",
      subtitle: "Limited time offers",
      imagePath: "/assets/pictures/herobanner/crazy_desk_extend.jpg",
      linkUrl: "/shop",
      order: 5,
      active: true,
    },
    {
      title: "Anti Tarnish Desk Collection",
      subtitle: "Premium quality guaranteed",
      imagePath: "/assets/pictures/herobanner/anti_desk.jpg",
      linkUrl: "/shop",
      order: 6,
      active: true,
    },
  ];

  for (const banner of heroBannerData) {
    await prisma.heroBanner.create({
      data: banner,
    });
  }

  console.log(`Seeded ${heroBannerData.length} hero banners`);
}

async function main() {
  console.log("Starting database seeding...");

  try {
    // Clear existing data (in correct order to respect foreign keys)
    console.log("Clearing existing data...");
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.productImage.deleteMany();
    await prisma.productVariant.deleteMany();
    await prisma.productCollection.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.heroBanner.deleteMany();

    // Create admin user
    console.log("Creating admin user...");
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await prisma.user.upsert({
      where: { email: "admin@lavishindia.com" },
      update: {},
      create: {
        email: "admin@lavishindia.com",
        name: "Admin User",
        password: hashedPassword,
        role: "ADMIN",
      },
    });

    // Create a test customer
    const customerPassword = await bcrypt.hash("customer123", 10);
    await prisma.user.upsert({
      where: { email: "customer@test.com" },
      update: {},
      create: {
        email: "customer@test.com",
        name: "Test Customer",
        password: customerPassword,
        role: "CUSTOMER",
      },
    });

    // Create initial site settings
    console.log("Creating site settings...");
    await prisma.siteSettings.upsert({
      where: { id: "default" },
      update: {},
      create: {
        id: "default",
        businessName: "Lavish India",
        address: "123 Jewelry Street, Mumbai, India",
        contactNumber: "+91-9876543210",
        email: "info@lavishindia.com",
        gstNumber: "GST123456789",
        instagram: "https://instagram.com/lavishindia",
        facebook: "https://facebook.com/lavishindia",
      },
    });

    // Seed hero banners
    await seedHeroBanners();

    // Seed categories and products
    await seedEarrings();
    await seedNecklaces();
    await seedRings();

    console.log("Database seeding completed successfully!");
    console.log("\n=== Login Credentials ===");
    console.log("Admin: admin@lavishindia.com / admin123");
    console.log("Customer: customer@test.com / customer123");
  } catch (error) {
    console.error("Error during seeding:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
