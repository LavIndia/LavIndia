import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Import seed data
import { users } from "./seed-data/users";
import { siteSettings } from "./seed-data/site-settings";
import { categories } from "./seed-data/categories";
import { heroBanners } from "./seed-data/hero-banners";
import { earrings } from "./seed-data/products-earrings";
import { necklaces } from "./seed-data/products-necklaces";
import { rings } from "./seed-data/products-rings";

const prisma = new PrismaClient();

/**
 * Create or update a category in the database
 */
async function createCategory(categoryData: {
  name: string;
  slug: string;
  description: string;
  isFeatured: boolean;
  featuredOrder: number;
  image: string | null;
}) {
  return await prisma.category.upsert({
    where: { slug: categoryData.slug },
    update: {},
    create: {
      name: categoryData.name,
      slug: categoryData.slug,
      description: categoryData.description,
      isFeatured: categoryData.isFeatured,
      featuredOrder: categoryData.featuredOrder,
      image: categoryData.image,
    },
  });
}

/**
 * Create a product with images and variants
 */
async function createProduct(
  categoryId: string,
  categorySlug: string,
  productData: {
    name: string;
    description: string;
    priceCents: number;
    compareAtCents?: number | null;
    images: string[];
    isFeatured: boolean;
    variants: Array<{
      name: string;
      color?: string | null;
      size?: string | null;
      material?: string | null;
      stock: number;
    }>;
  }
) {
  // Generate unique slug for product
  const baseSlug = productData.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  
  const slug = `${baseSlug}-${Date.now()}`;

  // Generate SKU
  const sku = `SKU-${categorySlug.toUpperCase()}-${Date.now()}`;

  // Calculate total stock from all variants
  const totalStock = productData.variants.reduce(
    (sum, variant) => sum + variant.stock,
    0
  );

  // Create product
  const product = await prisma.product.create({
    data: {
      name: productData.name,
      slug,
      description: productData.description,
      priceCents: productData.priceCents,
      compareAtCents: productData.compareAtCents || null,
      sku,
      stock: totalStock,
      isActive: true,
      isFeatured: productData.isFeatured,
      categoryId,
    },
  });

  // Create product images
  for (let i = 0; i < productData.images.length; i++) {
    const imagePath = `/assets/pictures/products/${categorySlug}/${productData.images[i]}`;
    
    await prisma.productImage.create({
      data: {
        url: imagePath,
        alt: `${productData.name} - Image ${i + 1}`,
        position: i,
        isPrimary: i === 0,
        productId: product.id,
      },
    });
  }

  // Create product variants
  for (const variantData of productData.variants) {
    await prisma.productVariant.create({
      data: {
        name: variantData.name,
        color: variantData.color || null,
        size: variantData.size || null,
        material: variantData.material || null,
        stock: variantData.stock,
        isActive: true,
        productId: product.id,
      },
    });
  }

  return product;
}

/**
 * Seed users into the database
 */
async function seedUsers() {
  console.log("Seeding users...");

  for (const userData of users) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        email: userData.email,
        name: userData.name,
        password: hashedPassword,
        role: userData.role,
      },
    });
  }

  console.log(`Seeded ${users.length} users`);
}

/**
 * Seed site settings
 */
async function seedSiteSettings() {
  console.log("Seeding site settings...");

  await prisma.siteSettings.upsert({
    where: { id: siteSettings.id },
    update: {},
    create: siteSettings,
  });

  console.log("Site settings created");
}

/**
 * Seed hero banners
 */
async function seedHeroBanners() {
  console.log("Seeding hero banners...");

  // Delete existing hero banners
  await prisma.heroBanner.deleteMany();

  // Create new hero banners
  for (const bannerData of heroBanners) {
    await prisma.heroBanner.create({
      data: bannerData,
    });
  }

  console.log(`Seeded ${heroBanners.length} hero banners`);
}

/**
 * Seed earrings category and products
 */
async function seedEarrings() {
  console.log("Seeding earrings...");

  const categoryData = categories.find((cat) => cat.slug === "earrings");
  if (!categoryData) {
    throw new Error("Earrings category not found in seed data");
  }

  const category = await createCategory(categoryData);

  let productsCreated = 0;
  for (const productData of earrings) {
    await createProduct(category.id, "earrings", productData);
    productsCreated++;
  }

  console.log(`Seeded ${productsCreated} earring products`);
}

/**
 * Seed necklaces category and products
 */
async function seedNecklaces() {
  console.log("Seeding necklaces...");

  const categoryData = categories.find((cat) => cat.slug === "necklaces");
  if (!categoryData) {
    throw new Error("Necklaces category not found in seed data");
  }

  const category = await createCategory(categoryData);

  let productsCreated = 0;
  for (const productData of necklaces) {
    await createProduct(category.id, "necklace", productData);
    productsCreated++;
  }

  console.log(`Seeded ${productsCreated} necklace products`);
}

/**
 * Seed rings category and products
 */
async function seedRings() {
  console.log("Seeding rings...");

  const categoryData = categories.find((cat) => cat.slug === "rings");
  if (!categoryData) {
    throw new Error("Rings category not found in seed data");
  }

  const category = await createCategory(categoryData);

  let productsCreated = 0;
  for (const productData of rings) {
    await createProduct(category.id, "rings", productData);
    productsCreated++;
  }

  console.log(`Seeded ${productsCreated} ring products`);
}

/**
 * Main seeding function
 */
async function main() {
  console.log("🌱 Starting database seeding...");
  console.log("=====================================\n");

  try {
    // Clear existing data (in correct order to respect foreign keys)
    console.log("🗑️  Clearing existing data...");
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.wishlistItem.deleteMany();
    await prisma.productImage.deleteMany();
    await prisma.productVariant.deleteMany();
    await prisma.productCollection.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.heroBanner.deleteMany();
    console.log("✅ Existing data cleared\n");

    // Seed users
    await seedUsers();
    console.log("");

    // Seed site settings
    await seedSiteSettings();
    console.log("");

    // Seed hero banners
    await seedHeroBanners();
    console.log("");

    // Seed categories and products
    await seedEarrings();
    console.log("");
    
    await seedNecklaces();
    console.log("");
    
    await seedRings();
    console.log("");

    console.log("=====================================");
    console.log("✅ Database seeding completed successfully!");
    console.log("=====================================\n");
    
    console.log("📝 Login Credentials:");
    console.log("-------------------------------------");
    console.log("Admin:");
    console.log("  Email: admin@lavishindia.com");
    console.log("  Password: admin123");
    console.log("");
    console.log("Test Customer:");
    console.log("  Email: customer@test.com");
    console.log("  Password: customer123");
    console.log("-------------------------------------\n");

    // Display summary
    const productCount = await prisma.product.count();
    const categoryCount = await prisma.category.count();
    const userCount = await prisma.user.count();
    const bannerCount = await prisma.heroBanner.count();

    console.log("📊 Database Summary:");
    console.log("-------------------------------------");
    console.log(`Categories: ${categoryCount}`);
    console.log(`Products: ${productCount}`);
    console.log(`Users: ${userCount}`);
    console.log(`Hero Banners: ${bannerCount}`);
    console.log("-------------------------------------\n");

  } catch (error) {
    console.error("❌ Error during seeding:", error);
    throw error;
  }
}

// Execute main function
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
