/**
 * Custom Worker entry point.
 *
 * The Cloudflare adapter generates a fetch handler for the Next.js app; we
 * re-export it unchanged and add a `scheduled` handler so Cloudflare Cron
 * Triggers can drive the publish loop. This replaces the Vercel Cron entry in
 * vercel.json — the schedule itself lives in wrangler.jsonc.
 *
 * The cron calls the route through the app's own fetch handler rather than
 * over the public internet: no DNS, no TLS, no second request billed, and it
 * works before a custom domain is attached.
 *
 * On types: this deliberately does NOT use Cloudflare's global Worker types.
 * Pulling them into the app's TypeScript program (which is what
 * `wrangler types` + tsconfig `include` does) replaces the DOM lib's
 * `Response.json(): Promise<any>` with `Promise<unknown>`, which breaks ~110
 * call sites across the app that have nothing to do with Cloudflare. The
 * handful of shapes this file needs are declared locally instead;
 * cloudflare-env.d.ts is still generated for reference and is git-ignored.
 */

interface CronEnv {
    CRON_SECRET?: string
    NEXT_PUBLIC_APP_URL?: string
}

// @ts-ignore `.open-next/worker.js` is generated at build time
import { default as handler } from './.open-next/worker.js'

export default {
    fetch: handler.fetch,

    async scheduled(_event: unknown, env: CronEnv, ctx: unknown) {
        const secret = env.CRON_SECRET

        if (!secret) {
            // Matches the route's own refusal: without the secret the request
            // would 401 anyway, so fail loudly here rather than silently.
            console.error('CRON_SECRET is not set — skipping the publish cron.')
            return
        }

        // The origin only has to make a well-formed URL; the call never leaves
        // the Worker. Prefer the real app URL when set, so anything that reads
        // the host sees the right value.
        const origin = env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://cron.internal'

        const request = new Request(`${origin}/api/cron/publish`, {
            method: 'GET',
            headers: { authorization: `Bearer ${secret}` },
        })

        const response: Response = await handler.fetch(request, env, ctx)

        if (!response.ok) {
            console.error(
                `Publish cron returned ${response.status}: ${await response.text()}`
            )
        }
    },
}
