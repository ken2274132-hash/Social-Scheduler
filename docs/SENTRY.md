> **Not currently wired up.** Sentry was removed on 3 Sep 2026 when the app
> moved to Cloudflare Workers: `@sentry/nextjs` targets Node and Vercel, not
> workerd, so it did nothing there — while costing 1251 KiB gzipped, which
> pushed the Worker over the 3 MB free-plan limit and would have meant paying
> $5/month for no error reporting.
>
> Until it comes back, errors are visible through `npx wrangler tail` and the
> Cloudflare dashboard (observability is enabled in `wrangler.jsonc`).
> To add real error tracking later, use **`@sentry/cloudflare`**, not this
> guide — everything below describes the Node/Vercel setup.

# Sentry Error Monitoring

Error + performance monitoring via `@sentry/nextjs` (v10) on Next.js 15 App Router.

**It is off unless a DSN is set.** With no DSN there is no `Sentry.init()`, no network
call, and `next.config.ts` is not even wrapped by the Sentry build plugin — local dev
and any deploy without the env vars behave exactly as they did before.

## What was wired

| File | Purpose |
| --- | --- |
| `instrumentation.ts` | Next.js server hook. Loads the Node or Edge config based on `NEXT_RUNTIME`, and exports `onRequestError = Sentry.captureRequestError` so errors in server components, route handlers and middleware are captured. |
| `sentry.server.config.ts` | `Sentry.init()` for the Node runtime (API routes, server actions, cron). |
| `sentry.edge.config.ts` | `Sentry.init()` for the Edge runtime (middleware, edge routes). |
| `instrumentation-client.ts` | `Sentry.init()` for the browser (Next 15.3+ loads this automatically; it replaces the old `sentry.client.config.ts`). Also exports `onRouterTransitionStart` for App Router navigation tracing. |
| `app/global-error.tsx` | Root error boundary; reports the error with `Sentry.captureException` and renders a styled fallback page. |
| `sentry.scrub.config.ts` | Shared redaction helpers used by all three `beforeSend` hooks. Not loaded by the SDK on its own. |
| `next.config.ts` | Wrapped in `withSentryConfig(...)` **only when a DSN is present**. |

### Cost controls (free tier)

- `tracesSampleRate` defaults to **0.1** (10% of transactions) on client, server and edge.
- **Session Replay is disabled** — `replaysSessionSampleRate: 0` and
  `replaysOnErrorSampleRate: 0`, and `replayIntegration` is never added.
- Profiling is not enabled.
- `automaticVercelMonitors: false`, so Vercel Cron jobs do not silently create
  paid cron monitors.

### Data scrubbing

This project handles OAuth access/refresh tokens and provider secrets, so every
event goes through `scrubEvent()` in `sentry.scrub.config.ts` before it is sent:

- `sendDefaultPii: false` — the SDK never attaches headers, cookies, IPs or bodies by itself.
- **Headers**: `authorization`, `cookie`/`set-cookie`, `x-api-key`, `x-*-token`,
  `x-hub-signature*`, `x-cron-secret` and friends are replaced with `[Redacted]`;
  `event.request.cookies` is deleted outright.
- **Keys**: any object key matching `token|secret|password|credential|api_key|auth|session|cookie|signature|bearer|jwt|dsn|salt|otp|private` or ending in `key`/`keys` has its value replaced. Applied recursively to `request.data`, `extra`, `contexts`, `tags`, breadcrumb data and stack-frame locals (depth-limited and cycle-safe).
- **Value shapes**: JWTs (`eyJ...`), `Bearer <...>`, Meta tokens (`EAA...`),
  and prefixed provider keys (`sk-`, `sk_`, `gsk_` Groq, `hf_` HuggingFace,
  `shpat_` Shopify, `pina_` Pinterest, `whsec_`, `ghp_`, `xoxb-`, `sb_secret_`, …)
  are redacted wherever they appear — including inside exception messages and URLs.
- **URLs / query strings**: params named like `token`, `code`, `secret`, `key`,
  `state`, `signature` are replaced; the path is kept so issues still group.
- **Literal env secrets**: server/edge events also have the *actual values* of
  `SUPABASE_SERVICE_ROLE_KEY`, `META_APP_SECRET`, `PINTEREST_APP_SECRET`,
  `SHOPIFY_API_SECRET`, `GROQ_API_KEY`, `OPENAI_API_KEY`, `HUGGINGFACE_API_KEY`,
  `ANTHROPIC_API_KEY`, `GOOGLE_AI_API_KEY`, `CRON_SECRET` and `SENTRY_AUTH_TOKEN`
  string-replaced out, even if they do not match any pattern. These names are only
  read in the Node/Edge configs, never in client code.
- **User**: only `user.id` is kept; email and IP are dropped.
- **Console breadcrumbs are dropped entirely** (`beforeBreadcrumb`) — a `console.log`
  of a token is the most likely way one would leak into an event.
- If scrubbing ever throws, `beforeSend` returns `null` and the event is **discarded**
  rather than sent unsanitised.

## Env vars to set in Vercel

Project → Settings → Environment Variables. Get the DSN from Sentry →
Settings → Projects → *your project* → Client Keys (DSN).

**Required to turn Sentry on** (both are the same DSN value; set for Production, and
Preview if you want preview errors too):

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SENTRY_DSN` | `https://<key>@<org>.ingest.<region>.sentry.io/<project-id>` |
| `SENTRY_DSN` | same value as above |

`NEXT_PUBLIC_SENTRY_DSN` is what browser errors use and is inlined at build time —
**changing it requires a redeploy**. `SENTRY_DSN` is read at runtime by the Node and
Edge runtimes.

**Optional — readable stack traces (source map upload at build time):**

| Variable | Value |
| --- | --- |
| `SENTRY_ORG` | your Sentry org slug |
| `SENTRY_PROJECT` | your Sentry project slug |
| `SENTRY_AUTH_TOKEN` | Sentry → Settings → Auth Tokens, scope `project:releases` |

Without `SENTRY_AUTH_TOKEN` the build simply skips the upload (no failure) — you
still get errors, just minified stack traces.

**Optional — tuning:**

| Variable | Default |
| --- | --- |
| `SENTRY_TRACES_SAMPLE_RATE` / `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` | `0.1` |
| `SENTRY_ENVIRONMENT` / `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | falls back to `VERCEL_ENV`, then `NODE_ENV` |

`SENTRY_RELEASE` falls back to `VERCEL_GIT_COMMIT_SHA` automatically.

Do **not** put the DSN in `.env.local` unless you specifically want local errors
showing up in Sentry — the whole point of the env gate is that local dev stays silent.

## How to verify it works

1. Set `NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_DSN` (locally in `.env.local`, or in
   Vercel), then **restart the dev server / redeploy** — the public DSN is baked in
   at build time.
2. **Server side** — add a throwaway route or hit an existing one that throws, e.g.
   temporarily `throw new Error('sentry server test')` inside any route handler.
   The error should appear in Sentry within ~30s tagged with the runtime.
3. **Client side** — in the browser console on any page of the app:
   ```js
   setTimeout(() => { throw new Error('sentry client test') })
   ```
   Or trigger a render error to exercise `app/global-error.tsx`.
4. **Check the SDK is actually live** — in the browser console,
   `window.__SENTRY__` should be defined. If it is `undefined`, the DSN was not
   present at build time.
5. **Confirm scrubbing** — open the captured event in Sentry and check the
   *Request → Headers* section: `authorization` and `cookie` must read `[Redacted]`,
   and there should be no cookies section at all.
6. **Confirm the off state** — unset both DSNs, rebuild, and `window.__SENTRY__`
   should be gone and no requests to `ingest.sentry.io` should appear in the
   Network tab.

Remember to remove any test throw afterwards.

## Notes / follow-ups

- `tunnelRoute` is intentionally **not** enabled. It would add a `/monitoring`
  route, and the current `middleware.ts` matcher intercepts everything outside
  `/api` and `/_next`, so the tunnel would be run through Supabase session
  handling. If ad blockers turn out to be swallowing browser events, enable
  `tunnelRoute: "/monitoring"` in `next.config.ts` **and** add `monitoring` to the
  middleware matcher's exclusion list in the same change.
- `sentry.scrub.config.ts` is named to match the `sentry.*.config.ts` family but is
  a plain helper module — the SDK does not auto-load it.
