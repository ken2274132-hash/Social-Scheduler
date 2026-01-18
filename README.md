# Social Media Scheduler + Auto Repurpose SaaS

## 🔐 Environment Setup

Before running the app, you need to set up your environment variables.

### 1. Create `.env.local` file

Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to **Settings** → **API**
3. Copy your project URL and anon key
4. Update `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

### 3. Run Database Migrations

1. Go to **SQL Editor** in Supabase Dashboard
2. Copy the contents of `supabase/schema.sql`
3. Paste and run it in the SQL Editor

This will create all necessary tables and security policies.

### 4. Set up Meta App (Instagram/Facebook)

Coming soon - this will be needed for Phase 3.

### 5. Choose AI Provider

**Groq** (Recommended - Free & Fast):
- Get key from [console.groq.com](https://console.groq.com)
- Update `.env.local`:
  ```
  GROQ_API_KEY=your-key-here
  ```

---

## 🚀 Running the App

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── login/             # Login page
│   ├── signup/            # Signup page
│   ├── dashboard/         # Main dashboard (protected)
│   └── page.tsx           # Landing page
├── components/            # Reusable UI components
│   ├── Header.tsx
│   └── Footer.tsx
├── lib/                   # Utilities
│   └── supabase/          # Supabase clients
├── supabase/              # Database schema
└── docs/                  # Progress tracking
```

## ✅ Completed Features

- ✅ Clean landing page with header/footer
- ✅ Signup & Login with Supabase Auth
- ✅ Protected routes with middleware
- ✅ Basic dashboard
- ✅ SEO optimization (meta tags, sitemap, etc.)

## 🔜 Coming Next

- Instagram OAuth integration
- AI content composer
- Post scheduling
- Auto-posting engine
