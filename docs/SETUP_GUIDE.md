# 🔧 Complete Setup Guide

Follow these steps to get your SaaS fully operational.

---

## 1️⃣ Supabase Setup (Database & Auth)

### Step 1: Create Supabase Project
1. Go to **[https://supabase.com](https://supabase.com)**
2. Click **"Start your project"**
3. Sign in with GitHub
4. Click **"New Project"**
5. Choose your organization
6. Enter:
   - **Name**: `social-scheduler` (or any name)
   - **Database Password**: Create a strong password
   - **Region**: Choose closest to you
7. Click **"Create new project"**
8. Wait 2-3 minutes for setup

### Step 2: Get API Credentials
1. In your project dashboard, click **"Settings"** (gear icon in sidebar)
2. Click **"API"**
3. You'll see:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (long string starting with `eyJ...`)
4. Copy both values

### Step 3: Run Database Schema
1. In Supabase dashboard, click **"SQL Editor"** in sidebar
2. Click **"New query"**
3. Open the file `supabase/schema.sql` in your project
4. Copy ALL the content
5. Paste it into the SQL Editor
6. Click **"Run"** (or press Ctrl+Enter)
7. You should see "Success" message

### Step 4: Update `.env.local`
Replace these lines in your `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-actual-key
```

---

## 2️⃣ Meta Developer App (Facebook/Instagram)

### Step 1: Create Meta Developer Account
1. Go to **[https://developers.facebook.com](https://developers.facebook.com)**
2. Click **"Get Started"**
3. Complete account setup

### Step 2: Create App
1. Click **"My Apps"** → **"Create App"**
2. Choose **"Business"** type
3. Enter:
   - **App Name**: `Social Media Scheduler`
   - **App Contact Email**: Your email
4. Click **"Create App"**

### Step 3: Add Facebook Login
1. In app dashboard, click **"Add Product"**
2. Find **"Facebook Login"** → Click **"Set Up"**
3. Choose **"Web"**
4. Enter Site URL: `http://localhost:3000` (for dev)
5. Save

### Step 4: Add Instagram Basic Display
1. Click **"Add Product"** again
2. Find **"Instagram Basic Display"** → Click **"Set Up"**
3. Click **"Create New App"**
4. Accept terms
5. Click **"Basic Display"** in sidebar

### Step 5: Configure OAuth Redirect
1. Go to **"App Settings"** → **"Basic"**
2. Scroll to **"App Domains"**
3. Add: `localhost` (for development)
4. Click **"Save Changes"**
5. Scroll down to find:
   - **App ID**
   - **App Secret** (click "Show")

### Step 6: Add Permissions
1. Go to **"App Review"** → **"Permissions and Features"**
2. Request these permissions:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_show_list`
   - `pages_read_engagement`

### Step 7: Update `.env.local`
```env
META_APP_ID=your-app-id-here
META_APP_SECRET=your-app-secret-here
NEXT_PUBLIC_META_APP_ID=your-app-id-here
```

---

## 3️⃣ Groq AI API Key (FREE & FAST!)

1. Go to **[https://console.groq.com](https://console.groq.com)**
2. Sign up with GitHub or Google
3. Click **"API Keys"** in the sidebar
4. Click **"Create API Key"**
5. Name it: `social-scheduler`
6. Copy the key (starts with `gsk_...`)
7. Update `.env.local`:
   ```env
   GROQ_API_KEY=gsk-...your-key
   ```

**Why Groq?**
- ⚡ Super fast (way faster than OpenAI)
- 🆓 **Completely FREE** (generous limits)
- 🔥 Uses Llama 3.3 70B (excellent quality)

---

## 4️⃣ Production Setup (When Ready to Deploy)

### Update App Domain
Update `.env.local`:
```env
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production
```

### Update Meta App Settings
1. Go to Meta Developer Console
2. Update **"App Domains"** with your production domain
3. Update **OAuth Redirect URIs**:
   - `https://yourdomain.com/api/auth/callback/meta`

---

## ✅ Verification

After completing all steps:

1. **Restart dev server**:
   ```bash
   npm run dev
   ```

2. **Test Signup**:
   - Go to `http://localhost:3000/signup`
   - Create an account
   - Should redirect to dashboard

3. **Test Login**:
   - Go to `http://localhost:3000/login`
   - Log in with your account

---

## 🆘 Troubleshooting

### "Supabase client error"
- Check if `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set correctly
- Make sure there are no extra spaces or quotes

### "Meta OAuth error"
- Ensure `META_APP_ID` is correct
- Check that OAuth redirect URL matches your app settings

### "AI API error"
- Verify your API key is active
- Check if you have credits/quota remaining

---

## 📝 Quick Reference

**Your `.env.local` should look like:**
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Meta
META_APP_ID=123456789
META_APP_SECRET=abc123...
NEXT_PUBLIC_META_APP_ID=123456789

# AI (choose one)
OPENAI_API_KEY=sk-...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

---

**After setup is complete, I'll continue building the remaining features! 🚀**
