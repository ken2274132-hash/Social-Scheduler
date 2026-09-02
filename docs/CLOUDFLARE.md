# Deploying to Cloudflare Workers

The app runs on Cloudflare Workers via [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare).
Local development is unchanged — keep using `npm run dev`.

## One-time setup

```bash
npx wrangler login          # opens a browser; you must do this yourself
```

Then set the runtime secrets. Each command prompts for the value, so nothing
lands in your shell history:

```bash
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put META_APP_SECRET
npx wrangler secret put PINTEREST_APP_SECRET
npx wrangler secret put SHOPIFY_API_SECRET
npx wrangler secret put GROQ_API_KEY
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put HUGGINGFACE_API_KEY
npx wrangler secret put CRON_SECRET
npx wrangler secret put META_APP_ID
npx wrangler secret put PINTEREST_APP_ID
npx wrangler secret put SHOPIFY_API_KEY
npx wrangler secret put SHOPIFY_SCOPES
```

### Generate a real CRON_SECRET first

`.env.local` still holds the placeholder it shipped with. Anyone who guesses it
can trigger the publish loop. Generate one and use it in both places:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## The build-time / runtime split — read this before your first deploy

`NEXT_PUBLIC_*` variables are **inlined into the bundle when the build runs**,
not read at runtime. `wrangler secret put` is too late for them.

| Variable | Where it must be set |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | build time |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | build time |
| `NEXT_PUBLIC_META_APP_ID` | build time |
| `NEXT_PUBLIC_APP_URL` | build time **and** runtime (the cron reads it) |
| everything else above | runtime (`wrangler secret put`) |

Deploying from this machine, the build-time ones come from `.env.local`. Using
Cloudflare's git integration (Workers Builds) instead, set them in the
dashboard under the build configuration, not just as Worker secrets.

`NEXT_PUBLIC_APP_URL` must be the real deployed URL — the Pinterest OAuth
redirect is built from it, and Pinterest matches redirect URIs exactly.

## Deploy

```bash
npm run preview   # build + run it locally on workerd, exactly as it deploys
npm run deploy    # build + push live
```

`npm run preview` is worth the extra minute: it catches anything that works
under `next dev`'s Node runtime but not under workerd.

## Cron

The every-5-minutes publish job is a Cloudflare Cron Trigger, declared in
`wrangler.jsonc` and handled by `worker.ts`. It calls `/api/cron/publish`
through the Worker's own fetch handler, so there is no second billed request
and no dependency on DNS being set up.

`vercel.json` still contains the old Vercel cron entry. It is inert on
Cloudflare — left in place only so a move back to Vercel stays easy.

Watch it run: `npx wrangler tail`.

## Custom domain

Workers → your worker → Settings → Domains & Routes → Add custom domain. Do
this **before** submitting to Meta for app review: put the permanent domain on
first and the host stays swappable afterwards without resubmitting.

After the domain is live, update `NEXT_PUBLIC_APP_URL` (rebuild required) and
add the new redirect URIs to the Meta, Pinterest and Shopify apps.

## Two deliberate differences from the Vercel deploy

- **`next/image` optimization is off** (`images.unoptimized` in
  `next.config.ts`). Workers cannot run Next's optimizer; the alternative is a
  Cloudflare Images binding, which is billed. Images are served at their
  original size.
- **`app/opengraph-image.tsx` no longer sets `runtime = 'edge'`.** OpenNext
  cannot bundle edge-runtime routes into the main Worker. `next/og` renders
  fine on the default runtime — `icon.tsx` and `apple-icon.tsx` always did.

## Sentry

`@sentry/nextjs` targets Node and Vercel, not workerd. The integration is
opt-in — with no DSN set, the build is untouched — so it is currently inert
here. Before setting a DSN on Cloudflare, check `@sentry/cloudflare`, and
treat `docs/SENTRY.md` as describing the Vercel path.
