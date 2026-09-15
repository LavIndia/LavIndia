# Database Seed System - Complete Guide

## 🎯 Overview

This project uses a **modular seed system** where all dummy data is organized in separate files, making it easy to understand, update, and maintain. Everything is stored in and loaded from PostgreSQL - **no hardcoded values in the application code**.

## 📁 File Structure

```
prisma/
├── seed.ts                          # Main seeding script
├── seed-old-backup.ts               # Backup of old seed file
├── schema.prisma                    # Database schema
└── seed-data/                       # All dummy data organized by type
    ├── README.md                    # Detailed seed data documentation
    ├── index.ts                     # Exports all modules
    ├── users.ts                     # User accounts
    ├── site-settings.ts             # Business settings
    ├── categories.ts                # Product categories
    ├── hero-banners.ts              # Homepage carousel
    ├── products-earrings.ts         # Earring products
    ├── products-necklaces.ts        # Necklace products
    └── products-rings.ts            # Ring products
```

## 🚀 Quick Start

### 1. Reset Database and Seed Fresh Data

```bash
# Reset database and apply migrations
npm run db:push

# Seed the database with dummy data
npm run db:seed
```

### 2. View Data in Prisma Studio

```bash
npm run db:studio
```

This opens a browser interface to view and edit database records.

## 📊 What Gets Seeded

### Users (4 accounts)

- 1 Admin account
- 3 Customer accounts

### Categories (3 categories)

- Earrings
- Necklaces
- Rings

### Products (28 products)

- 8 Earring products
- 10 Necklace products
- 10 Ring products

### Product Variants (80+ variants)

Each product has multiple variants with different:

- Colors (Gold, Silver, Rose Gold, etc.)
- Sizes (Small, Medium, Large, or ring sizes)
- Materials (Gold Plated, Sterling Silver, etc.)
- Stock levels

### Hero Banners (6 banners)

Homepage carousel images with links

### Site Settings

Business information, contact details, social media links

## 🎨 Asset Organization

All images are stored in `/public/assets/pictures/`:

```
public/assets/pictures/
├── categories/           # Category hero images
│   ├── earrings/
│   ├── necklace/
│   └── rings/
├── herobanner/          # Homepage carousel images
├── loginCoursels/       # Login page carousel
└── products/            # Product images
    ├── earrings/        # 23 images
    ├── necklace/        # 36 images
    └── rings/           # 23 images
```

### Image Naming Convention

Product image filenames are listed at the top of each product seed file:

- `products-earrings.ts` → `earringImages` array
- `products-necklaces.ts` → `necklaceImages` array
- `products-rings.ts` → `ringImages` array

## 🔧 How to Update Data

### Adding a New Product

1. **Choose the category** (earrings, necklaces, or rings)
2. **Open the file**: `prisma/seed-data/products-[category].ts`
3. **Check available images** at the top of the file
4. **Add your product**:

```typescript
{
  name: "Beautiful Gold Earrings",
  description: "Elegant earrings perfect for weddings",
  priceCents: 299900,        // ₹2,999 (always in paisa)
  compareAtCents: 399900,    // Optional: was ₹3,999
  images: [
    earringImages[0],        // Use images from the array
    earringImages[1],
    earringImages[2],
  ],
  isFeatured: true,          // Show on homepage
  variants: [
    {
      name: "Gold - Small",
      color: "Gold",
      size: "Small",
      material: "Gold Plated",
      stock: 15,             // Available quantity
    },
    // Add more variants...
  ],
}
```

5. **Run seed**: `npm run db:seed`

### Modifying Existing Products

1. Find the product in the appropriate file
2. Edit the values
3. Re-run seed script

### Adding New Images

1. **Add image** to `/public/assets/pictures/products/[category]/`
2. **Update image array** in seed file:
   ```typescript
   export const earringImages = [
     "existing-image.jpg",
     "your-new-image.jpg", // Add here
   ];
   ```
3. **Use in products** by referencing `earringImages[index]`

### Updating Site Settings

Edit `prisma/seed-data/site-settings.ts`:

```typescript
export const siteSettings = {
  businessName: "Your Business Name",
  address: "Your Address",
  contactNumber: "+91-1234567890",
  email: "your@email.com",
  // ... other settings
};
```

### Adding Hero Banners

1. **Add image** to `/public/assets/pictures/herobanner/`
2. **Edit** `prisma/seed-data/hero-banners.ts`:
   ```typescript
   {
     title: "New Collection",
     subtitle: "Shop Now",
     imagePath: "/assets/pictures/herobanner/your-image.jpg",
     linkUrl: "/collection",
     order: 7,
     active: true,
   }
   ```

## 💰 Price Format

**Important**: Prices are stored in **paisa** (like cents) to avoid decimal issues.

| Display Price | Stored Value |
| ------------- | ------------ |
| ₹1,499        | `149900`     |
| ₹2,999.50     | `299950`     |
| ₹599          | `59900`      |

**Formula**: Display Price × 100 = Stored Value

## 🔐 Default Login Credentials

After seeding, use these credentials:

### Admin Dashboard

- **Email**: `admin@lavishindia.com`
- **Password**: `admin123`
- **Access**: Full admin panel access

### Test Customer

- **Email**: `customer@test.com`
- **Password**: `customer123`
- **Access**: Customer features (cart, orders, wishlist)

## 📝 Database Commands

```bash
# Generate Prisma Client (after schema changes)
npm run db:generate

# Push schema to database (development)
npm run db:push

# Create a new migration
npm run db:migrate

# Seed database
npm run db:seed

# Open Prisma Studio (GUI)
npm run db:studio
```

## 🔄 Data Flow

```
Seed Files (seed-data/*.ts)
    ↓
Main Seed Script (seed.ts)
    ↓
PostgreSQL Database
    ↓
API Routes (/api/...)
    ↓
Frontend Components
    ↓
User Interface
```

**Everything flows from the database** - no hardcoded data in components!

## ✅ Verification Checklist

After seeding, verify:

- [ ] All products appear on homepage
- [ ] Categories show correct counts
- [ ] Product images load correctly
- [ ] Variants display properly
- [ ] Hero banners rotate on homepage
- [ ] Admin login works
- [ ] Customer login works
- [ ] Prisma Studio shows all data

## 🐛 Troubleshooting

### Seed fails

```bash
# Clear and try again
npm run db:push
npm run db:seed
```

### Images not showing

- Check image exists in `/public/assets/pictures/`
- Verify filename matches exactly (case-sensitive)
- Check browser console for 404 errors

### Products not appearing

- Verify `isActive: true` in product data
- Check `isFeatured: true` for homepage display
- Ensure category exists and is linked

### Price displays wrong

- Remember to multiply by 100 for storage
- Check database value in Prisma Studio
- Verify division by 100 in frontend code

## 📚 Related Documentation

- **Seed Data Details**: `prisma/seed-data/README.md`
- **Database Schema**: `prisma/schema.prisma`
- **API Routes**: `app/api/*/route.ts`
- **Components**: `components/`

## 🎓 Admin Dashboard Usage

When you update products via admin dashboard:

1. Changes are saved to PostgreSQL
2. Data automatically appears on frontend
3. No need to update seed files (unless you want to preserve for next seed)

Seed files are mainly for:

- Initial setup
- Development testing
- Resetting to clean state
- Understanding data structure

## 🚨 Important Notes

1. **Never commit passwords** - Change default passwords in production
2. **Images must exist** - Seed will succeed but images won't show
3. **Stock is calculated** - Product stock = sum of all variant stocks
4. **Slugs are unique** - Auto-generated with timestamps
5. **Backup before seeding** - Seeding clears all existing data!

## 🎉 Benefits of This System

✅ **Easy to understand** - Each file has one purpose  
✅ **Easy to update** - Change data without touching code  
✅ **No hardcoded values** - Everything from database  
✅ **Organized assets** - Clear image structure  
✅ **Type-safe** - TypeScript catches errors  
✅ **Scalable** - Add new categories easily  
✅ **Maintainable** - Clear separation of concerns

---

**Need help?** Check `prisma/seed-data/README.md` for detailed examples!
