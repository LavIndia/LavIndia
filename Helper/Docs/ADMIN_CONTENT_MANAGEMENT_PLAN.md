# Admin Content Management System - Implementation Plan

## Current Admin Structure

### ✅ Already Implemented

1. **Dashboard** - `/admin/dashboard`
   - Total products, orders, customers, revenue stats
   - Charts and recent orders
2. **Products Management** - `/admin/products`
   - Create, edit, delete products
   - Bulk upload functionality
   - Product images, variants management
   - Search, filter, sort
3. **Categories** - `/admin/categories`
   - Create, edit, delete categories
   - View product count per category
4. **Orders** - `/admin/orders`
   - View and manage orders
   - Update order status
5. **Customers** - `/admin/customers`
   - View customer list
6. **Analytics** - `/admin/analytics`
   - Analytics dashboard
7. **Settings** - `/admin/settings`
   - Site settings (business name, contact, social links)
8. **Audit Logs** - `/admin/audit-logs`
   - Track admin actions

### ✅ APIs Already Available

- `/api/admin/products` - Product CRUD
- `/api/admin/categories` - Category CRUD
- `/api/admin/orders` - Order management
- `/api/admin/settings` - Settings management
- `/api/discounts/active` - Active discounts (read only)
- `/api/carousel-images` - Login carousel images (file-based)

---

## Home Page Content Analysis

### Current Home Page Sections (in order):

1. **Header Section** (HeaderSection.tsx)

   - Navigation, Search, Cart, User Menu
   - ❌ **Not Admin Controlled** - Hardcoded

2. **Hero Banner** (HeroBanner.tsx)

   - Carousel with 3 slides
   - ❌ **Not Admin Controlled** - Hardcoded array
   - Database: `HeroBanner` model exists but not used
   - **NEEDS**: Admin interface to manage slides

3. **Explore Section** (ExploreSection.tsx)

   - Shows 3 category cards (Earrings, Necklaces, Rings)
   - ❌ **Not Admin Controlled** - Hardcoded array
   - **Could use**: Category table data

4. **Bestsellers Section** (BestsellersSection.tsx)

   - ✅ **Auto-managed** - Fetches from `/api/products/bestsellers`
   - Based on order count (most ordered products)

5. **Shop Under Budget** (ShopUnderBudgetSection.tsx)

   - Price range cards (₹500, ₹1000, ₹1500, ₹2000)
   - ❌ **Not Admin Controlled** - Hardcoded ranges
   - **NEEDS**: Admin interface for budget tiers

6. **Free Gifts Banner** (FreeGiftsBanner.tsx)

   - Promotional message
   - ❌ **Not Admin Controlled** - Hardcoded text
   - **NEEDS**: Admin interface for promotional banners

7. **New Arrivals Section** (NewArrivalsSection.tsx)

   - ✅ **Auto-managed** - Fetches from `/api/products/new-arrivals`
   - Shows products from last 30 days

8. **Trust Badges Banner** (TrustBadgesBanner.tsx)

   - COD, Customer count (9L+), Support hours
   - ❌ **Not Admin Controlled** - Hardcoded
   - **NEEDS**: Admin interface for trust badges

9. **Coupons Section** (CouponsSection.tsx)

   - ✅ **Partially Controlled** - Fetches from `/api/discounts/active`
   - ❌ **Missing**: Admin interface to create/edit discounts

10. **Footer Section** (FooterSection.tsx)

    - Company info, links, social media
    - ❌ **Not Admin Controlled** - Hardcoded
    - **Could use**: Settings table data

11. **Top Promo Banner** (TopPromoBanner.tsx - in Header)
    - Scrolling messages ("Welcome to Lavish India", "Diwali Sale is Live")
    - ❌ **Not Admin Controlled** - Hardcoded array
    - **NEEDS**: Admin interface for promo messages

---

## Missing Admin Features - Priority List

### 🔴 HIGH PRIORITY (Critical for Content Control)

#### 1. **Hero Banner Management**

- **Admin Page**: `/admin/hero-banners`
- **Features**:
  - Upload banner images (desktop & mobile)
  - Set title, subtitle, CTA link
  - Set display order
  - Enable/disable banners
  - Preview before publish
- **API Endpoints**:
  - `GET /api/admin/hero-banners` - List all
  - `POST /api/admin/hero-banners` - Create
  - `PUT /api/admin/hero-banners/[id]` - Update
  - `DELETE /api/admin/hero-banners/[id]` - Delete
  - `PATCH /api/admin/hero-banners/[id]/order` - Reorder
- **Database**: Use existing `HeroBanner` model

#### 2. **Discount/Coupon Management**

- **Admin Page**: `/admin/discounts`
- **Features**:
  - Create discount codes
  - Set discount type (percentage/fixed)
  - Set min purchase, max discount
  - Set validity dates
  - Usage limits
  - Enable/disable
  - Track usage count
- **API Endpoints**:
  - `GET /api/admin/discounts` - List all
  - `POST /api/admin/discounts` - Create
  - `PUT /api/admin/discounts/[id]` - Update
  - `DELETE /api/admin/discounts/[id]` - Delete
- **Database**: Use existing `Discount` model

#### 3. **Promotional Banners Management**

- **Admin Page**: `/admin/promo-banners`
- **Features**:
  - Free Gifts banner content
  - Top scrolling messages
  - Special offer announcements
  - Enable/disable individual banners
  - Schedule banners (start/end dates)
- **New Database Model**: `PromoBanner`
  ```prisma
  model PromoBanner {
    id          String   @id @default(cuid())
    type        String   // 'top_scroll', 'free_gifts', 'special_offer'
    title       String?
    message     String
    bgColor     String?
    textColor   String?
    isActive    Boolean  @default(true)
    startDate   DateTime?
    endDate     DateTime?
    order       Int      @default(0)
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt
  }
  ```

### 🟡 MEDIUM PRIORITY (Improves Flexibility)

#### 4. **Budget Tiers Management**

- **Admin Page**: `/admin/shop-budgets` or add to Settings
- **Features**:
  - Add/remove price tiers
  - Customize tier labels
  - Set background colors/gradients
  - Set order
- **New Database Model**: `BudgetTier`
  ```prisma
  model BudgetTier {
    id         String  @id @default(cuid())
    title      String
    maxPrice   Int     // in paisa
    gradient   String  // CSS gradient
    order      Int     @default(0)
    isActive   Boolean @default(true)
  }
  ```

#### 5. **Trust Badges Management**

- **Admin Page**: Add to `/admin/settings`
- **Features**:
  - Update customer count (9L+)
  - Update rating (4.8)
  - Update support hours
  - Enable/disable specific badges
  - Customize badge text and icons
- **Extend Database**: Add to `SiteSettings` model
  ```prisma
  model SiteSettings {
    // ... existing fields
    codAvailable      Boolean  @default(true)
    customerCount     String   @default("9L+")
    rating            String   @default("4.8")
    supportHoursStart String   @default("10:30 AM")
    supportHoursEnd   String   @default("5:30 PM")
  }
  ```

#### 6. **Explore Section Management**

- **Option A**: Use existing Category data
- **Option B**: Create custom featured collections
- **Admin Page**: `/admin/featured-collections`
- **Features**:
  - Select categories to feature
  - Upload custom images for each
  - Set display order
  - Control which categories appear on home

### 🟢 LOW PRIORITY (Nice to Have)

#### 7. **Homepage Layout Manager**

- **Admin Page**: `/admin/homepage-layout`
- **Features**:
  - Drag-drop to reorder sections
  - Show/hide individual sections
  - A/B testing different layouts
- **New Database Model**: `HomePageSection`
  ```prisma
  model HomePageSection {
    id        String  @id @default(cuid())
    name      String  // 'hero', 'bestsellers', 'explore', etc.
    isVisible Boolean @default(true)
    order     Int     @default(0)
  }
  ```

#### 8. **Footer Management**

- **Admin Page**: Add to `/admin/settings`
- **Features**:
  - Update footer links
  - Update copyright text
  - Manage quick links sections
  - Social media links (already in settings)

#### 9. **SEO Management**

- **Admin Page**: `/admin/seo`
- **Features**:
  - Home page meta title, description
  - Category page SEO
  - Product page SEO templates
  - Open Graph images
  - Structured data

---

## Implementation Phases

### Phase 1: Critical Content Control (Week 1)

1. Hero Banner Management
2. Discount/Coupon Management
3. Promotional Banners Management

### Phase 2: Enhanced Flexibility (Week 2)

4. Budget Tiers Management
5. Trust Badges in Settings
6. Explore Section using Categories

### Phase 3: Advanced Features (Week 3)

7. Homepage Layout Manager
8. Footer Management
9. SEO Management

---

## Technical Requirements

### File Upload System

- Need image upload for hero banners
- Store in `/public/assets/admin-uploads/hero-banners/`
- Consider: Cloudinary or AWS S3 for production

### API Structure

All new admin APIs should:

- Require authentication (admin role)
- Log to audit table
- Return consistent response format
- Handle errors gracefully

### Database Migrations

Need migrations for:

- `PromoBanner` model
- `BudgetTier` model
- `HomePageSection` model
- Extend `SiteSettings` model

### Component Updates

After admin interfaces are built, update these components to fetch from DB:

- `HeroBanner.tsx` - fetch from `/api/hero-banners/active`
- `FreeGiftsBanner.tsx` - fetch from `/api/promo-banners?type=free_gifts`
- `TopPromoBanner.tsx` - fetch from `/api/promo-banners?type=top_scroll`
- `TrustBadgesBanner.tsx` - fetch from `/api/settings` (trust badge fields)
- `ShopUnderBudgetSection.tsx` - fetch from `/api/budget-tiers`
- `ExploreSection.tsx` - fetch from `/api/categories/featured`

---

## Summary

**Current State:**

- ✅ 8 admin pages working
- ✅ Product, Category, Order, Customer management complete
- ✅ Settings page basic
- ❌ 6 major home page sections not admin-controlled

**Need to Build:**

- 🔴 3 High Priority admin pages (Hero Banners, Discounts, Promo Banners)
- 🟡 3 Medium Priority features (Budget Tiers, Trust Badges, Featured Collections)
- 🟢 3 Low Priority features (Layout Manager, Footer, SEO)

**Total New Components:**

- 9 admin pages/sections
- 15+ API endpoints
- 4 new database models
- 6 component updates to fetch from DB
