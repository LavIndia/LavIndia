# 🎯 Quick Reference - Seed Data System

## File Locations

| Data Type | File Path | Description |
|-----------|-----------|-------------|
| **Users** | `prisma/seed-data/users.ts` | Admin & customer accounts |
| **Settings** | `prisma/seed-data/site-settings.ts` | Business info & contact |
| **Categories** | `prisma/seed-data/categories.ts` | Product categories |
| **Banners** | `prisma/seed-data/hero-banners.ts` | Homepage carousel |
| **Earrings** | `prisma/seed-data/products-earrings.ts` | 8 earring products |
| **Necklaces** | `prisma/seed-data/products-necklaces.ts` | 10 necklace products |
| **Rings** | `prisma/seed-data/products-rings.ts` | 10 ring products |

## Quick Commands

```bash
# Seed database
npm run db:seed

# View database in GUI
npm run db:studio

# Reset & seed
npm run db:push && npm run db:seed
```

## Login Credentials

```
Admin:     admin@lavishindia.com / admin123
Customer:  customer@test.com / customer123
```

## Current Data Summary

- ✅ 3 Categories (Earrings, Necklaces, Rings)
- ✅ 28 Products (all with images from assets folder)
- ✅ 80+ Product Variants (different colors, sizes, materials)
- ✅ 6 Hero Banners (homepage carousel)
- ✅ 5 Users (1 admin, 4 customers)
- ✅ Site Settings (all business info)

## Image Assets Used

### Earrings
- **Location**: `/public/assets/pictures/products/earrings/`
- **Count**: 23 images
- **Used by**: 8 products

### Necklaces
- **Location**: `/public/assets/pictures/products/necklace/`
- **Count**: 36 images
- **Used by**: 10 products

### Rings
- **Location**: `/public/assets/pictures/products/rings/`
- **Count**: 23 images
- **Used by**: 10 products

### Hero Banners
- **Location**: `/public/assets/pictures/herobanner/`
- **Count**: 6 images (all used)

### Categories
- **Location**: `/public/assets/pictures/categories/`
- **Count**: 3 images (all used)

## Updating Products - Example

```typescript
// File: prisma/seed-data/products-earrings.ts

{
  name: "Golden Drop Earrings",
  description: "Beautiful gold plated earrings",
  priceCents: 199900,              // ₹1,999
  compareAtCents: 249900,          // Was ₹2,499
  images: [
    earringImages[0],              // Use from image array
    earringImages[1],
    earringImages[2],
  ],
  isFeatured: true,                // Show on homepage
  variants: [
    {
      name: "Gold - Small",
      color: "Gold",
      size: "Small",
      material: "Gold Plated",
      stock: 15,                   // In stock
    },
  ],
}
```

## Price Conversion

| Display | Storage |
|---------|---------|
| ₹999    | 99900   |
| ₹1,499  | 149900  |
| ₹2,999  | 299900  |

**Formula**: Price in ₹ × 100 = Storage value

## Data Flow

```
Seed Files → PostgreSQL → API → Components → UI
```

**No hardcoded values** - everything from database!

## Common Tasks

### Add New Product
1. Edit `prisma/seed-data/products-[category].ts`
2. Add product object to array
3. Run `npm run db:seed`

### Update Site Info
1. Edit `prisma/seed-data/site-settings.ts`
2. Change values
3. Run `npm run db:seed`

### Change Hero Banners
1. Edit `prisma/seed-data/hero-banners.ts`
2. Update or add banners
3. Run `npm run db:seed`

## Files Changed from Original

### ✅ Removed
- Old monolithic `seed.ts` → backed up as `seed-old-backup.ts`

### ✅ Created
- `prisma/seed.ts` - New modular seed script
- `prisma/seed-data/` - All data files
- `Helper/Docs/DATABASE_SEED_GUIDE.md` - Complete guide

### ✅ No Changes Needed
- All application code stays the same
- All API routes stay the same
- All components stay the same
- **Everything just works!**

## Verification Checklist

After seeding:
- [ ] Products appear on homepage
- [ ] Categories work correctly
- [ ] Images load properly
- [ ] Admin login successful
- [ ] Customer login successful
- [ ] Prisma Studio shows data

## 📚 Full Documentation

- **Complete Guide**: `Helper/Docs/DATABASE_SEED_GUIDE.md`
- **Seed Data Details**: `prisma/seed-data/README.md`

---

**Remember**: Everything is now organized, no hardcoded values, all data in PostgreSQL! 🎉
