/**
 * Every Pinterest call has to talk to the same host. An access token minted by
 * one environment is rejected by the other, so if the token exchange, the token
 * refresh and the publish disagree about the base URL, publishing fails with a
 * generic auth error that looks nothing like the actual cause.
 *
 * They did disagree: the callback minted tokens against production while the
 * publish posted pins to the sandbox. Resolve it in one place instead.
 *
 * Default is production, which is what "Trial access" apps use — trial means
 * the live API with reduced limits, not the sandbox. Set
 * PINTEREST_API_BASE_URL=https://api-sandbox.pinterest.com to point everything
 * at the sandbox instead; it is all-or-nothing by design.
 */
export function pinterestApiBaseUrl(): string {
    const configured = process.env.PINTEREST_API_BASE_URL?.trim()
    return (configured || 'https://api.pinterest.com').replace(/\/$/, '')
}
