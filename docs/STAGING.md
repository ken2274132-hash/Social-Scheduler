# 🧪 Staging environment

A staging copy of the app for testing migrations and OAuth changes before they touch real
user accounts. Cost: **$0** — a second Supabase Free project plus a second Vercel Hobby
project.

Two rules make the rest of this work:

1. **Staging gets its own database.** Never point staging at the production Supabase project.
2. **Staging needs a fixed domain**, not per-branch preview URLs — because of OAuth
   (see [§4](#4-the-oauth-catch)).

---

## 1. Branch layout

```
main      -> production Vercel project
staging   -> staging Vercel project
```

```powershell
git checkout -b staging
git push -u origin staging
```

Work goes to `staging`, gets tested, then merges to `main`.

---

## 2. Staging database — a second Supabase project

Supabase Free allows two active projects per organisation. If you already have two, put
staging in a new organisation.

1. Supabase dashboard → **New project**. Name it `social-scheduler-staging`, same region
   as production, save the database password.
2. Dump production's schema (no rows) with the backup script:

   ```powershell
   $env:SUPABASE_DB_URL = "postgresql://postgres:PROD_PASSWORD@db.PROD.supabase.co:5432/postgres"
   .\scripts\backup-db.ps1 -SchemaOnly -RetentionDays 0
   # -> backups\schema_2026-09-02_141000.dump
   ```

3. Restore it into staging:

   ```powershell
   $env:PGPASSWORD = "STAGING_PASSWORD"
   pg_restore `
     --host db.STAGING.supabase.co --port 5432 --username postgres --dbname postgres `
     --no-owner --no-privileges --schema public `
     ".\backups\schema_2026-09-02_141000.dump"
   $env:PGPASSWORD = $null
   ```

   `--schema public` skips the Supabase-managed `auth`, `storage` and `extensions`
   schemas, which your role cannot write to. See `docs/BACKUPS.md` for the full mechanics.

4. In the staging project's SQL editor, run everything in `supabase/migrations/` that
   production has, in filename order. They are idempotent.
5. Create the **`media` Storage bucket** (public) — Storage config is not in the dump, and
   AI image generation writes there.
6. **Do not copy production rows.** Sign up a fresh test user instead. Production rows carry
   live OAuth tokens; a staging bug could publish to a real customer's Facebook Page.

Re-run steps 2–3 whenever production's schema drifts.

---

## 3. Staging deployment on Vercel

Create a **second Vercel project** from the same GitHub repo:

- Production Branch: `staging`
- Give it a stable domain, e.g. `social-scheduler-staging.vercel.app`

> Why a second project and not just preview deployments? Preview URLs contain a deployment
> hash and change on every push. Meta, Pinterest and Shopify all match redirect URIs
> **exactly**, so a rotating URL can never be registered. A separate project with one fixed
> domain is the only workable option.

### Environment variables that MUST differ

| Variable | Staging value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | staging project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | staging anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | staging service role key |
| `NEXT_PUBLIC_APP_URL` | `https://social-scheduler-staging.vercel.app` |
| `CRON_SECRET` | a **different** random secret |
| `META_APP_ID` / `META_APP_SECRET` / `NEXT_PUBLIC_META_APP_ID` | staging Meta app, or the prod app with staging redirect URIs added |
| `PINTEREST_APP_ID` / `PINTEREST_APP_SECRET` | same choice as Meta |
| `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET` | same choice as Meta |

Generate a staging `CRON_SECRET`:

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }))
```

### Can be shared with production

`GROQ_API_KEY`, `HUGGINGFACE_API_KEY` — but they share one free quota, so a staging test
loop can exhaust production's AI credits. A separate free key is safer.

### Must stay off

| Variable | Staging value |
|---|---|
| `DEV_BYPASS_AUTH` | unset / `false` — it would skip the login screen |
| `ENABLE_DEMO_ACCOUNTS` | unset |
| `NODE_ENV` | leave it alone, Vercel sets it |

### Cron

`vercel.json` is in the repo, so the staging project gets the same `*/5 * * * *` cron on
`/api/cron/publish`. Vercel injects `Authorization: Bearer $CRON_SECRET` automatically from
that project's own `CRON_SECRET`. That means **staging will really publish** any due posts
to whatever accounts are connected there — one more reason not to copy production rows.

---

## 4. The OAuth catch

This is what breaks staging every time. Redirect URIs are registered **per app**, matched
exactly, and the three providers do not agree on where the URI comes from:

| Provider | Callback path | URI built from |
|---|---|---|
| Meta | `/api/auth/callback/meta` | `request.nextUrl.origin` — the actual request host |
| Shopify | `/api/shopify/callback` | `request.nextUrl.origin` |
| Pinterest | `/api/auth/callback/pinterest` | **`NEXT_PUBLIC_APP_URL`** |

Two consequences:

- If `NEXT_PUBLIC_APP_URL` on staging still points at production, the **Pinterest** flow
  starts on staging and comes back on production. It fails, confusingly. Set it correctly.
- Meta and Shopify follow whichever host you browsed to, which is exactly why random
  preview URLs cannot work.

### Register these on staging

Assuming `https://social-scheduler-staging.vercel.app`:

- **Meta** (developers.facebook.com → Facebook Login → Settings → Valid OAuth Redirect URIs)
  `https://social-scheduler-staging.vercel.app/api/auth/callback/meta`
  Also add `social-scheduler-staging.vercel.app` under App Settings → Basic → App Domains.
- **Pinterest** (developers.pinterest.com → your app → Callback URLs)
  `https://social-scheduler-staging.vercel.app/api/auth/callback/pinterest`
- **Shopify** (Partners → your app → App setup → Allowed redirection URL(s))
  `https://social-scheduler-staging.vercel.app/api/shopify/callback`

Adding staging URIs to the **existing** apps is quickest. A **separate staging app** is
safer — you cannot break production's OAuth config with a typo, and staging keeps working
while the production app sits in review. The trade-off: Meta apps in development mode only
let users with an app role log in, and a fresh Pinterest app is back in trial/sandbox
(see `docs/PINTEREST_PRODUCTION_ACCESS.md`).

WordPress needs nothing here — it uses per-site application passwords, not OAuth. Just
connect a throwaway site on staging.

---

## 5. Smoke test before promoting to production

Run against staging after every schema change or OAuth change.

**Auth**
- [ ] Sign up a new user → lands on the dashboard
- [ ] Log out, log back in
- [ ] Password reset email arrives and `/reset-password` loads (not a 404)
- [ ] `/admin` is refused for a non-admin user

**Connections**
- [ ] Connect Meta → account appears in Settings
- [ ] Connect Pinterest → account appears
- [ ] Connect Shopify → products list loads
- [ ] Connect a WordPress site → its posts list loads
- [ ] Disconnect actually removes the row

**Core flow**
- [ ] Upload media → visible in the composer
- [ ] AI caption generates (no 500)
- [ ] AI image generates and returns a URL, not a base64 blob
- [ ] Schedule a post 5 minutes out → it publishes on its own within ~5 min
- [ ] "Publish now" publishes **only** that post
- [ ] Delete a post, delete a media asset — both succeed
- [ ] Repurpose a WordPress post into social posts

**Security regressions** (these have all bitten before — see `docs/AUDIT_2026-08-31.md`)
- [ ] View source on `/settings`, `/composer`, `/workflow`, `/calendar` and search for
      `access_token` — must find nothing
- [ ] `curl https://social-scheduler-staging.vercel.app/api/cron/publish` → **401**
- [ ] Same URL with the correct `Authorization: Bearer` header → **200**
- [ ] The Vercel build has no type or lint errors

**Then promote**

```powershell
git checkout main
git merge staging
git push
```

Afterwards, confirm production's `NEXT_PUBLIC_APP_URL` and Supabase keys still point at
production, and run the production migrations if the change included any.
