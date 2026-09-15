# 🚀 Quick Start Guide - Lavish India Admin Dashboard

## Step 1: Start the Development Server

```bash
cd c:\Users\krish\Krishna2025\startup2026\LAVISHINDIA\app-fresh
npm run dev
```

## Step 2: Access the Application

Open your browser and go to:

```
http://localhost:3000
```

## Step 3: Login as Admin

**Admin Credentials:**

- Email: `admin@lavishindia.com`
- Password: `admin123`

**What happens after login:**

- ✨ **Admins are automatically redirected to `/admin/dashboard`**
- No need to manually navigate - it happens instantly!

**Test Customer Credentials:**

- Email: `customer@test.com`
- Password: `customer123`

## Step 4: Explore Admin Dashboard

After logging in as admin, you'll be automatically taken to:

```
http://localhost:3000/admin/dashboard
```

You can also manually visit this URL anytime while logged in as admin.

## What You'll See

### ✅ Admin Dashboard Features (Currently Working):

1. **Sidebar Navigation**

   - Dashboard
   - Products (page not yet created)
   - Categories (page not yet created)
   - Orders (page not yet created)
   - Customers (page not yet created)
   - Analytics (page not yet created)
   - Settings (page not yet created)
   - Audit Logs (page not yet created)

2. **Summary Cards**

   - Total Revenue (with trend)
   - Orders count (with today's count)
   - Active Products count
   - Total Customers count

3. **Charts**

   - Sales overview (7-day line chart)
   - Orders by status (bar chart)

4. **Recent Orders Table**

   - Order ID, Customer, Total, Status, Date
   - Shows last 10 orders

5. **Top Bar**
   - Notifications bell (UI only, no functionality yet)
   - User dropdown menu with logout

## Testing Different User Roles

### As ADMIN:

- Can access `/admin/*` routes
- See admin dashboard and all features
- Has access to all admin operations

### As CUSTOMER:

- Login with `customer@test.com`
- Try to access `/admin/dashboard`
- Will be redirected to homepage (/)
- Can access customer routes: `/profile`, `/orders`, etc.

### As Guest (Not Logged In):

- Try to access `/admin/dashboard`
- Will be redirected to homepage with login prompt

## Database Reset (If Needed)

If you need to reset your database:

```bash
# Reset database and run migrations
npx prisma migrate reset --force

# Seed the database with sample data
npx prisma db seed
```

This will:

- Drop all tables
- Recreate schema
- Run all migrations
- Seed admin user, test customer, and sample products

## Troubleshooting

### Issue: Cannot access admin dashboard

**Solution:** Make sure you're logged in with admin credentials

### Issue: Page shows "Unauthorized" or redirects

**Solution:** Clear your cookies and login again

### Issue: Database connection error

**Solution:**

1. Check PostgreSQL is running
2. Verify `.env` DATABASE_URL is correct
3. Run `npx prisma migrate dev`

### Issue: TypeScript errors

**Solution:**

```bash
npx prisma generate
```

## Next Development Steps

See `ADMIN_DASHBOARD_IMPLEMENTATION.md` for:

- Complete feature list
- What's implemented vs. what's remaining
- Step-by-step implementation guide
- API route structure
- File structure

## Quick Access Links

When running locally:

- Homepage: http://localhost:3000
- Admin Dashboard: http://localhost:3000/admin/dashboard
- Customer Profile: http://localhost:3000/profile

## Support

For detailed implementation docs, see:

- `Helper/Docs/ADMIN_DASHBOARD_IMPLEMENTATION.md`
- `Helper/Docs/AUTH_IMPLEMENTATION.md`
- `Helper/Docs/PROFILE_SYSTEM_GUIDE.md`
