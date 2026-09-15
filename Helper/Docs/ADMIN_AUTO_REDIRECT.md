# 🔄 Admin Auto-Redirect Behavior

## Overview

The admin dashboard now features **smart automatic redirects** based on user roles. When an admin logs in, they are **automatically redirected** to the admin dashboard without any manual navigation needed.

---

## 🎯 How It Works

### For ADMIN Users:

1. **Login from homepage:**

   - Visit `http://localhost:3000`
   - Click "Login" or "Sign In"
   - Enter admin credentials:
     - Email: `admin@lavishindia.com`
     - Password: `admin123`
   - **→ Automatically redirected to `/admin/dashboard`** ✨

2. **Visiting homepage while logged in:**

   - If already logged in as admin
   - Try to visit `/` (homepage)
   - **→ Automatically redirected to `/admin/dashboard`** ✨

3. **Direct admin URL access:**
   - Visit any `/admin/*` URL directly
   - If logged in as admin: Access granted ✅
   - If not logged in: Redirected to login → Then to requested admin page

### For CUSTOMER Users:

1. **Login from homepage:**

   - Enter customer credentials:
     - Email: `customer@test.com`
     - Password: `customer123`
   - **→ Stays on homepage or goes to `/profile`** (normal customer flow)

2. **Attempting to access admin routes:**
   - Try to visit `/admin/dashboard` or any `/admin/*` route
   - **→ Redirected to homepage** with access denied ❌

### For Guest Users (Not Logged In):

1. **Attempting to access admin routes:**
   - Try to visit `/admin/dashboard`
   - **→ Redirected to homepage with login prompt**
   - After login: Redirected back to requested admin page (if admin)

---

## 🔧 Technical Implementation

### Middleware Logic

Located in: `middleware.ts`

```typescript
// Redirect admin users from homepage to admin dashboard
if (isHomePage && isLoggedIn && userRole === "ADMIN") {
  return NextResponse.redirect(new URL("/admin/dashboard", nextUrl.origin));
}
```

### Key Features:

1. **Role Detection:** Checks `req.auth.user.role` from JWT session
2. **Homepage Check:** Detects when admin visits `/`
3. **Auto-Redirect:** Sends admin to `/admin/dashboard` automatically
4. **Seamless UX:** Happens instantly, no user action needed

---

## 🧪 Testing the Auto-Redirect

### Test Case 1: Admin Login Auto-Redirect

```bash
1. Logout if currently logged in
2. Visit http://localhost:3000
3. Click "Login" or "Sign In"
4. Enter: admin@lavishindia.com / admin123
5. Submit login form
6. ✅ Should automatically land on /admin/dashboard
```

### Test Case 2: Admin Homepage Redirect

```bash
1. Already logged in as admin
2. Visit http://localhost:3000 (homepage)
3. ✅ Should automatically redirect to /admin/dashboard
```

### Test Case 3: Customer Login (No Redirect)

```bash
1. Logout if currently logged in
2. Visit http://localhost:3000
3. Click "Login" or "Sign In"
4. Enter: customer@test.com / customer123
5. Submit login form
6. ✅ Should stay on homepage (no admin redirect)
```

### Test Case 4: Customer Blocked from Admin

```bash
1. Logged in as customer
2. Manually visit http://localhost:3000/admin/dashboard
3. ✅ Should redirect to homepage (access denied)
```

### Test Case 5: Guest Redirect to Login

```bash
1. Not logged in
2. Visit http://localhost:3000/admin/dashboard
3. ✅ Should redirect to homepage with login prompt
```

---

## 📊 Redirect Flow Diagram

```
┌─────────────────────────────────────────────┐
│         User Visits Homepage (/)            │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │   Is User Logged In? │
        └──────────┬───────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
         ▼                   ▼
    ┌────────┐          ┌────────┐
    │  Yes   │          │   No   │
    └────┬───┘          └────┬───┘
         │                   │
         ▼                   ▼
  ┌──────────────┐    ┌──────────────┐
  │ Check Role   │    │ Show Homepage│
  └──────┬───────┘    │ with Login   │
         │            └──────────────┘
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐  ┌──────────┐
│ ADMIN │  │ CUSTOMER │
└───┬───┘  └─────┬────┘
    │            │
    ▼            ▼
┌────────────┐ ┌─────────────┐
│ Redirect → │ │ Stay on     │
│ /admin/    │ │ Homepage or │
│ dashboard  │ │ /profile    │
└────────────┘ └─────────────┘
```

---

## 🎨 User Experience Benefits

### For Admins:

✅ **Zero clicks after login** - Direct access to admin panel  
✅ **No manual navigation** - Automatic redirect handles it  
✅ **Faster workflow** - Jump straight into admin tasks  
✅ **Intuitive** - Homepage automatically becomes admin dashboard

### For Customers:

✅ **Protected experience** - Can't accidentally access admin  
✅ **Clear separation** - Customer and admin areas distinct  
✅ **Normal flow** - Homepage works as expected

### For System:

✅ **Security** - Role-based access enforced at middleware level  
✅ **Performance** - Server-side redirect (fast)  
✅ **Maintainable** - Centralized logic in middleware

---

## 🔐 Security Considerations

1. **Middleware-Level Protection:**

   - Runs before any page renders
   - Checks authentication at the edge
   - Cannot be bypassed by client-side code

2. **Role Verification:**

   - Role stored in encrypted JWT
   - Verified on every request
   - Admin access requires exact role match

3. **Redirect Chain Security:**
   - No infinite redirects (single redirect per request)
   - Preserves callback URLs for auth flows
   - Prevents unauthorized access attempts

---

## 🛠️ Customization Options

### Change Admin Redirect Target

Edit `middleware.ts`:

```typescript
// Current: Redirects to dashboard
if (isHomePage && isLoggedIn && userRole === "ADMIN") {
  return NextResponse.redirect(new URL("/admin/dashboard", nextUrl.origin));
}

// Alternative: Redirect to products page
if (isHomePage && isLoggedIn && userRole === "ADMIN") {
  return NextResponse.redirect(new URL("/admin/products", nextUrl.origin));
}
```

### Add Redirect Exception for Admins

```typescript
// Allow admins to view homepage if they explicitly want to
const allowAdminHomepage = nextUrl.searchParams.get("view") === "store";

if (isHomePage && isLoggedIn && userRole === "ADMIN" && !allowAdminHomepage) {
  return NextResponse.redirect(new URL("/admin/dashboard", nextUrl.origin));
}

// Usage: http://localhost:3000?view=store
// This would let admin see homepage instead of redirect
```

---

## 📝 Summary

**What Changed:**

- ✅ Added auto-redirect for admin users on homepage
- ✅ Updated middleware to detect admin role
- ✅ Enhanced user experience for admins

**How to Use:**

1. Login with admin credentials
2. You're automatically at `/admin/dashboard`
3. That's it! No manual navigation needed.

**Benefits:**

- Faster admin workflow
- Better UX
- Clearer role separation
- More secure access control

---

## 🚀 Next Steps

The auto-redirect is now active! Try it yourself:

```bash
# Start the dev server
npm run dev

# Visit homepage
http://localhost:3000

# Login as admin
Email: admin@lavishindia.com
Password: admin123

# ✨ Watch the magic - auto-redirect to admin dashboard!
```

Enjoy your streamlined admin experience! 🎉
