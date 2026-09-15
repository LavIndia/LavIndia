# User Profile System Implementation Guide

## 🎯 Overview

Complete user profile system with addresses, orders, wishlist, and profile picture upload functionality.

---

## ✅ What's Already Implemented

### 1. **Database Schema** (Prisma)

✅ Updated `User` model with `profilePicture` field
✅ `Address` model for multiple shipping addresses
✅ `Order` and `OrderItem` models for order history
✅ `WishlistItem` model for wishlisted products

### 2. **Wishlist API** (`/api/user/wishlist`)

✅ GET - Fetch user's wishlist with product details
✅ POST - Add product to wishlist
✅ DELETE - Remove product from wishlist

### 3. **Profile Picture Upload API** (`/api/user/profile-picture`)

✅ POST - Upload profile picture to `public/assets/User/`
✅ DELETE - Remove profile picture
✅ File validation (type, size)
✅ Unique filename generation

### 4. **ProductCard Component**

✅ Heart/Love button with animation
✅ Toggle wishlist on/off
✅ Visual feedback (filled heart for wishlisted)
✅ Toast notifications
✅ Session-based authorization

### 5. **Toast Notifications**

✅ Installed `sonner` package
✅ Added `<Toaster />` to root layout
✅ Configured for rich colors and top-right position

---

## 🚧 Next Steps (What You Need to Do)

### **STEP 1: Run Database Migrations**

```bash
npx prisma db push
npx prisma generate
```

This will:

- Add `profilePicture` field to User table
- Generate updated Prisma client
- Fix all TypeScript errors in API routes

---

### **STEP 2: Create Address Management API**

**File:** `app/api/user/address/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Fetch all user addresses
export async function GET() {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    include: { addresses: { orderBy: { isDefault: "desc" } } },
  });

  return NextResponse.json({ addresses: user?.addresses || [] });
}

// POST - Create new address
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await request.json();
  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
  });

  // If setting as default, unset others
  if (data.isDefault) {
    await prisma.address.updateMany({
      where: { userId: user!.id },
      data: { isDefault: false },
    });
  }

  const address = await prisma.address.create({
    data: {
      ...data,
      userId: user!.id,
    },
  });

  return NextResponse.json({ address });
}

// PUT - Update address
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, ...data } = await request.json();
  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
  });

  if (data.isDefault) {
    await prisma.address.updateMany({
      where: { userId: user!.id },
      data: { isDefault: false },
    });
  }

  const address = await prisma.address.update({
    where: { id, userId: user!.id },
    data,
  });

  return NextResponse.json({ address });
}

// DELETE - Delete address
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  await prisma.address.delete({ where: { id: id! } });

  return NextResponse.json({ success: true });
}
```

---

### **STEP 3: Create User Profile Page**

**File:** `app/profile/page.tsx`

This page should have tabs for:

1. **Profile Info** - Name, email, mobile, profile picture upload
2. **Addresses** - List, add, edit, delete addresses
3. **Orders** - Order history with status
4. **Wishlist** - All wishlisted products

Use shadcn/ui components:

- `Tabs` for navigation
- `Card` for sections
- `Avatar` for profile picture
- `Button` for actions
- `Dialog` for forms

---

### **STEP 4: Update UserMenu Component**

**File:** `components/auth/UserMenu.tsx`

Replace the user icon with:

```tsx
{
  session.user.profilePicture ? (
    <Avatar>
      <AvatarImage src={session.user.profilePicture} alt={session.user.name} />
      <AvatarFallback>{session.user.name?.[0]}</AvatarFallback>
    </Avatar>
  ) : (
    <User className="h-5 w-5" />
  );
}
```

Add "Profile" link to dropdown menu pointing to `/profile`

---

### **STEP 5: Create Wishlist Page**

**File:** `app/wishlist/page.tsx`

- Fetch wishlist from `/api/user/wishlist`
- Display products in grid layout
- Use ProductCard component with `isWishlisted={true}`
- Show empty state with CTA to browse products

---

### **STEP 6: Create Orders Page**

**File:** `app/orders/page.tsx`

- Fetch orders from `/api/user/orders` (you'll need to create this)
- Display order cards with:
  - Order number
  - Date
  - Status badge
  - Total amount
  - Items preview
  - "View Details" button

---

## 📁 File Structure

```
app/
  api/
    user/
      profile-picture/
        route.ts ✅ Created
      wishlist/
        route.ts ✅ Created
      address/
        route.ts ⏳ To create
      orders/
        route.ts ⏳ To create
  profile/
    page.tsx ⏳ To create
  wishlist/
    page.tsx ⏳ To create
  orders/
    page.tsx ⏳ To create

components/
  ProductCard.tsx ✅ Updated with wishlist
  auth/
    UserMenu.tsx ⏳ To update

public/
  assets/
    User/ ✅ Created (for profile pictures)
```

---

## 🎨 UI/UX Recommendations

### Profile Page Tabs:

```
┌─────────────────────────────────────┐
│  Profile | Addresses | Orders | Wishlist
├─────────────────────────────────────┤
│                                     │
│  [Tab Content Here]                 │
│                                     │
└─────────────────────────────────────┘
```

### Profile Picture Upload:

- Circular avatar preview
- "Upload" button
- "Remove" button
- File size/type validation feedback
- Drag & drop support (optional)

### Address Cards:

- Default badge for primary address
- Edit/Delete buttons
- "Set as Default" option
- Add New Address button

### Order Cards:

- Order #123456
- Date: Jan 15, 2025
- Status: Delivered (green badge)
- ₹2,499
- 3 items
- "View Details" →

---

## 🔐 Authorization

All API routes are protected with:

```typescript
const session = await auth();
if (!session?.user) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

---

## 📦 Dependencies Already Installed

✅ `next-auth` - Authentication
✅ `@prisma/client` - Database ORM
✅ `lucide-react` - Icons (Heart, User, etc.)
✅ `sonner` - Toast notifications
✅ `shadcn/ui` - UI components

---

## 🚀 Quick Start Commands

```bash
# 1. Push schema changes
npx prisma db push

# 2. Generate Prisma client
npx prisma generate

# 3. Start dev server
npm run dev

# 4. Test wishlist
# - Sign in
# - Click heart on any product
# - See toast notification
```

---

## 📝 Environment Variables

Already configured in `.env.local`:

```bash
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
DATABASE_URL=...
```

No additional env vars needed!

---

## ✨ Features Implemented

✅ **Wishlist**

- Add/remove products
- Heart animation
- Toast feedback
- Session-based

✅ **Profile Picture**

- Upload to `/assets/User/`
- File validation
- Auto-resize path
- Delete option

✅ **Database Models**

- User with profilePicture
- Address (multiple per user)
- Order & OrderItem
- WishlistItem

---

## 🎯 What's Left

⏳ Address Management UI
⏳ Profile Page with Tabs
⏳ Orders Page & API
⏳ Wishlist Page
⏳ UserMenu profile picture

---

## 💡 Tips

1. **Testing Wishlist:**

   - Make sure you're signed in
   - Click heart on ProductCard
   - Check toast notification
   - Heart should fill red

2. **Profile Picture:**

   - Max 5MB
   - Formats: JPEG, PNG, WebP
   - Stored in `public/assets/User/`
   - Accessible via `/assets/User/filename.jpg`

3. **Addresses:**
   - One can be marked as default
   - Used for checkout
   - Required: name, mobile, address, city, state, pincode

---

Ready to build the UI components! 🚀
