import { defineCloudflareConfig } from '@opennextjs/cloudflare'

/**
 * Default configuration: no incremental cache, no tag cache, no queue.
 *
 * This app has no ISR pages — every route is either static or rendered on
 * demand — so there is nothing for the cache layers to do, and leaving them
 * out keeps the deploy inside the Workers free plan (the R2/KV/Durable Object
 * backed caches are what would start costing money).
 */
export default defineCloudflareConfig()
