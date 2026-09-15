# Seed Data Documentation

This directory contains all the dummy data used to populate the database during development and testing.

## Structure

```
seed-data/
├── index.ts                    # Exports all seed data modules
├── users.ts                    # User accounts (admin, customers)
├── site-settings.ts            # Business information and settings
├── categories.ts               # Product categories (Earrings, Necklaces, Rings)
├── hero-banners.ts             # Homepage hero banner carousel
├── products-earrings.ts        # Earring products with variants
├── products-necklaces.ts       # Necklace products with variants
└── products-rings.ts           # Ring products with variants
```

## Files Description

### `users.ts`

Contains user accounts for testing:

- **Admin account**: Full access to admin dashboard
- **Customer accounts**: For testing customer flows

**Note**: Passwords are plain text in this file but will be hashed during seeding.

### `site-settings.ts`

Business information displayed across the site:

- Business name
- Contact information
- GST number
- Social media links

### `categories.ts`

Product categories with:

- Name and slug (URL-friendly)
- Description
- Featured status and order
- Category image path

### `hero-banners.ts`

Homepage carousel banners with:

- Title and subtitle
- Image path from assets folder
- Link URL
- Display order
- Active status

### `products-earrings.ts`

Earring products including:

- Product details (name, description, price)
- Image references (actual files from `/public/assets/pictures/products/earrings/`)
- Variants (color, size, material, stock)
- Featured status

**Available Images**: 23 earring images listed at the top of the file

### `products-necklaces.ts`

Necklace products with same structure as earrings.

**Available Images**: 36 necklace images listed at the top of the file

### `products-rings.ts`

Ring products with same structure as earrings.

**Available Images**: 23 ring images listed at the top of the file

## How to Update Data

### Adding a New Product

1. Open the appropriate product file (`products-earrings.ts`, etc.)
2. Check the image array at the top for available images
3. Add your product to the array:

```typescript
{
  name: "Product Name",
  description: "Detailed description",
  priceCents: 199900, // ₹1,999 (stored in paisa)
  compareAtCents: 249900, // Optional: Original price for discount display
  images: [
    imageArrayName[0],
    imageArrayName[1],
    imageArrayName[2],
  ],
  isFeatured: true, // Show on homepage
  variants: [
    {
      name: "Variant Name",
      color: "Gold",
      size: "Medium",
      material: "Gold Plated",
      stock: 15,
    },
  ],
}
```

### Adding a New Category

1. Open `categories.ts`
2. Add your category:

```typescript
{
  name: "Category Name",
  slug: "category-url-slug",
  description: "Category description",
  isFeatured: true,
  featuredOrder: 4, // Display order
  image: "/assets/pictures/categories/your-category/image.jpg",
}
```

3. Create a new product file: `products-categoryname.ts`
4. Export it from `index.ts`
5. Add seeding function in `../seed.ts`

### Adding a New Hero Banner

1. Place image in `/public/assets/pictures/herobanner/`
2. Open `hero-banners.ts`
3. Add banner:

```typescript
{
  title: "Banner Title",
  subtitle: "Banner Subtitle",
  imagePath: "/assets/pictures/herobanner/your-image.jpg",
  linkUrl: "/destination-page",
  order: 7, // Display order
  active: true,
}
```

### Updating Site Settings

1. Open `site-settings.ts`
2. Update any field as needed
3. All changes will be applied on next seed

## Price Format

Prices are stored in **paisa (cents)** to avoid floating-point issues:

- ₹1,499 → `149900`
- ₹2,999.50 → `299950`

## Image Paths

All images must exist in the `/public/assets/pictures/` directory:

```
/public/assets/pictures/
├── categories/
│   ├── earrings/
│   ├── necklace/
│   └── rings/
├── herobanner/
├── loginCoursels/
└── products/
    ├── earrings/
    ├── necklace/
    └── rings/
```

## Running the Seed

```bash
# Using npm
npm run seed

# Using package.json script
npx prisma db seed
```

## Important Notes

1. **No Hardcoded Values**: All data is now in these files, making it easy to update
2. **All Data Loads from PostgreSQL**: The app fetches everything from the database
3. **Image Files Must Exist**: Ensure all referenced images are in the assets folder
4. **Stock Calculation**: Product stock is automatically calculated from variant stocks
5. **Unique Slugs**: Product slugs are auto-generated with timestamps to ensure uniqueness

## Troubleshooting

### Seed fails with "Image not found"

- Check that the image file exists in the correct folder
- Verify the filename matches exactly (case-sensitive)

### Prices appear wrong

- Remember to convert to paisa: multiply rupees by 100
- Example: ₹25.99 = 2599 paisa

### Product not showing

- Check `isActive: true` in product data
- For homepage display: `isFeatured: true`
- Verify category exists and is linked

## Data Summary

Current seed data includes:

- **4 Users** (1 admin, 3 customers)
- **3 Categories** (Earrings, Necklaces, Rings)
- **6 Hero Banners** (Homepage carousel)
- **8 Earring Products** (with 2-4 variants each)
- **10 Necklace Products** (with 1-3 variants each)
- **10 Ring Products** (with 2-4 variants each)

**Total**: ~28 products with 80+ variants
