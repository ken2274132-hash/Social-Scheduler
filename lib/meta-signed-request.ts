/**
 * Meta signs its server-to-server callbacks with a `signed_request` — a payload
 * and an HMAC of that payload, joined by a dot, both base64url.
 *
 * Verifying it is the only thing standing between the deletion callback and
 * anyone on the internet who can guess a user id, so this is not optional and
 * not something to "fix later". An unverified callback is a stranger able to
 * delete another person's connected accounts by POSTing a URL.
 *
 * Web Crypto rather than node:crypto throughout: this runs on workerd, where
 * node:crypto is not available.
 */

export interface SignedRequestPayload {
    /** The app-scoped id of the person the request is about. */
    user_id?: string
    algorithm?: string
    issued_at?: number
    [key: string]: unknown
}

/** base64url — Meta's encoding — is base64 with two characters swapped and the padding dropped. */
function base64UrlToBytes(value: string): Uint8Array {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const binary = atob(padded)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes
}

/**
 * Compare in constant time.
 *
 * A normal `===` on the signatures leaks, through how long it takes to fail,
 * how many leading bytes were right — enough to forge a signature one byte at a
 * time given enough attempts.
 */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false
    let difference = 0
    for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i]
    return difference === 0
}

/**
 * The payload if the signature is genuinely ours, or null for anything else.
 *
 * Returning null rather than throwing is deliberate: every failure here — bad
 * shape, wrong algorithm, forged signature — is the same answer to the caller,
 * and none of them should produce a different response that could be used to
 * probe which part was wrong.
 */
export async function verifySignedRequest(
    signedRequest: string,
    appSecret: string
): Promise<SignedRequestPayload | null> {
    if (!signedRequest || !appSecret) return null

    const parts = signedRequest.split('.')
    if (parts.length !== 2) return null

    const [encodedSignature, encodedPayload] = parts
    if (!encodedSignature || !encodedPayload) return null

    let payload: SignedRequestPayload
    try {
        payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(encodedPayload)))
    } catch {
        return null
    }

    // Meta has only ever sent HMAC-SHA256 here. Refusing anything else keeps a
    // future "algorithm: none" from being accepted as valid.
    if (payload.algorithm !== 'HMAC-SHA256') return null

    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(appSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    )

    // The signature covers the encoded payload exactly as it arrived — signing
    // a re-encoded copy would not match.
    const expected = new Uint8Array(
        await crypto.subtle.sign('HMAC', key, encoder.encode(encodedPayload))
    )

    let provided: Uint8Array
    try {
        provided = base64UrlToBytes(encodedSignature)
    } catch {
        return null
    }

    return timingSafeEqual(expected, provided) ? payload : null
}

/**
 * A short code the person can quote back to check their deletion.
 *
 * Meta shows this to the user, so it wants to be readable rather than a UUID.
 */
export function newConfirmationCode(): string {
    const bytes = new Uint8Array(8)
    crypto.getRandomValues(bytes)
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
