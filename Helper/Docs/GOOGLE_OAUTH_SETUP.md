# Google OAuth Setup Guide for Lavish India

## ✅ Current Configuration

Your app is correctly configured with:
- **Callback URL**: `http://localhost:3000/api/auth/callback/google`
- **Client ID**: `99672118383-1podkr6uukdtkn7s4vf427vqolv6mlr8.apps.googleusercontent.com`
- **Client Secret**: Already set in `.env.local`

---

## 🔧 Google Cloud Console Settings

### **In Google Cloud Console** (https://console.cloud.google.com/)

#### 1. **Authorized JavaScript Origins**
Add these URLs under "Authorized JavaScript origins":
```
http://localhost:3000
```

**For Production (when deploying):**
```
https://yourdomain.com
```

#### 2. **Authorized Redirect URIs**
Add these URLs under "Authorized redirect URIs":

**Development:**
```
http://localhost:3000/api/auth/callback/google
```

**Production (when deploying):**
```
https://yourdomain.com/api/auth/callback/google
```

---

## 📋 Complete Setup Checklist

### ✅ **OAuth Consent Screen**
1. Go to "OAuth consent screen" in Google Cloud Console
2. **User Type**: External (or Internal if using Google Workspace)
3. **App Information**:
   - App name: `Lavish India`
   - User support email: `your-email@example.com`
   - App logo: (optional) Upload your logo
4. **Scopes**: Add these scopes:
   - `userinfo.email`
   - `userinfo.profile`
5. **Test users** (for External apps in testing):
   - Add your email addresses that will test the app

### ✅ **Credentials**
1. Go to "Credentials" → "OAuth 2.0 Client IDs"
2. Click on your OAuth client ID
3. **Authorized JavaScript origins**:
   ```
   http://localhost:3000
   ```
4. **Authorized redirect URIs**:
   ```
   http://localhost:3000/api/auth/callback/google
   ```
5. Click **SAVE**

---

## 🚀 For Production Deployment

When you deploy to production (e.g., Vercel, Netlify, etc.):

### 1. Update `.env.local` (or `.env.production`):
```bash
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=<generate-new-secret-with-openssl-rand-base64-32>
GOOGLE_CLIENT_ID=99672118383-1podkr6uukdtkn7s4vf427vqolv6mlr8.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
```

### 2. Add Production URLs to Google Console:
**Authorized JavaScript origins:**
```
https://yourdomain.com
```

**Authorized redirect URIs:**
```
https://yourdomain.com/api/auth/callback/google
```

---

## 🧪 Testing the OAuth Flow

### **Expected Flow:**
1. User clicks "Continue with Google" button
2. Redirects to Google login page
3. User signs in with Google
4. Google redirects back to: `http://localhost:3000/api/auth/callback/google`
5. NextAuth processes the callback
6. User is redirected to homepage (`/`) - **LOGGED IN** ✅

### **Common Issues & Fixes:**

#### ❌ "Redirect URI Mismatch" Error
**Fix**: Make sure the exact URL is added in Google Console:
```
http://localhost:3000/api/auth/callback/google
```
(No trailing slash!)

#### ❌ "App Not Verified" Warning
**Fix**: This is normal for apps in testing mode. You can:
- Click "Advanced" → "Go to Lavish India (unsafe)" during testing
- OR publish your app (requires verification for production)

#### ❌ User Redirected but Not Logged In
**Fix**: Already fixed in the code! The `signIn` callback now returns `true` for all sign-ins.

---

## 🔍 Verify Your Setup

Run this checklist:

- [ ] `.env.local` has `NEXTAUTH_URL=http://localhost:3000`
- [ ] `.env.local` has valid `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- [ ] Google Console has `http://localhost:3000` in JavaScript origins
- [ ] Google Console has `http://localhost:3000/api/auth/callback/google` in redirect URIs
- [ ] OAuth consent screen is configured with scopes
- [ ] Dev server is running: `npm run dev`
- [ ] Test the Google login flow

---

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Check terminal logs where `npm run dev` is running
3. Verify all URLs match exactly (no trailing slashes)
4. Make sure you're using the correct Google account for testing

---

## 🎉 You're All Set!

Your Google OAuth is properly configured. Users can now:
- ✅ Sign up with Google
- ✅ Sign in with Google
- ✅ Auto-redirect to homepage after authentication
- ✅ Profile picture synced from Google account
