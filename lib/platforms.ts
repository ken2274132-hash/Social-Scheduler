/**
 * Connected accounts come in two kinds, and they are not interchangeable.
 *
 * A **destination** is somewhere we publish TO. A **source** is somewhere we
 * pull existing content FROM, to repurpose into social posts.
 *
 * WordPress is a source only. The blog is where posts come from; this app does
 * not write to it. Keeping the two lists here — rather than testing for
 * 'wordpress' in each picker — is what stops a blog from reappearing in a
 * destination dropdown the next time one is added.
 */

export const PUBLISHING_PLATFORMS = ['instagram', 'facebook', 'pinterest'] as const
export const CONTENT_SOURCE_PLATFORMS = ['wordpress'] as const

export type PublishingPlatform = (typeof PUBLISHING_PLATFORMS)[number]
export type ContentSourcePlatform = (typeof CONTENT_SOURCE_PLATFORMS)[number]

/** Somewhere we can publish to. Unknown platforms are treated as destinations. */
export function isPublishingPlatform(platform: string | null | undefined): boolean {
    return !isContentSourcePlatform(platform)
}

/** Somewhere we only read content from. */
export function isContentSourcePlatform(platform: string | null | undefined): boolean {
    return CONTENT_SOURCE_PLATFORMS.includes(
        (platform || '').toLowerCase() as ContentSourcePlatform
    )
}

/** Split a mixed list of connected accounts into the two groups. */
export function splitByRole<T extends { platform: string }>(accounts: T[]) {
    return {
        destinations: accounts.filter((a) => isPublishingPlatform(a.platform)),
        sources: accounts.filter((a) => isContentSourcePlatform(a.platform)),
    }
}
