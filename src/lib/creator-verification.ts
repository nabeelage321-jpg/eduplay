/**
 * SOCIAL-CREATOR VERIFICATION GATE (2026-11-07, build-list final 6,
 * item 13). Two creator types, handled separately:
 *
 * (a) KIDS make games for their friends only — private, safety
 *     first. They NEVER get the social editor / public posting.
 * (b) SOCIAL MEDIA CREATORS make games for reach/audience. They get
 *     a social editor — GATED: they put our website link on their
 *     social media, WE VERIFY (manual first — the creator submits
 *     their social profile/post URL, status pending until the team
 *     verifies it), THEN the editor tab opens.
 *
 * ENFORCEMENT: if they remove the link after verification, the team
 * sets the status to 'revoked' and the editor CLOSES (the editor
 * checks status at open time). Videos made in the social editor
 * carry OUR NAME (branded renders) so they are identifiable as ours,
 * and the team reaches out to the platform to remove the reel/video.
 * Branding-on-video is for the gated social-editor videos ONLY —
 * the earlier no-forced-watermark rule for kids'/teachers' downloads
 * still stands (the plain video page stays unbranded).
 *
 * Automatic re-checking of the link is PHASE 2 — not in this
 * version; the team re-checks by hand.
 *
 * Pure access decision only — the API route does the DB work, the UI
 * does the rendering. Kept separate so the gate is testable without
 * a database or a session.
 */

export type CreatorVerificationStatus = 'none' | 'pending' | 'verified' | 'revoked'

export type SocialEditorAccess =
  | { kind: 'signin' }
  | { kind: 'kid' }
  | { kind: 'setup' }
  | { kind: 'submit' }
  | { kind: 'pending' }
  | { kind: 'verified' }

/** Platforms a creator can verify from (manual check, phase 1). */
export const VERIFICATION_PLATFORMS = ['tiktok', 'instagram', 'youtube', 'facebook'] as const
export type VerificationPlatform = (typeof VERIFICATION_PLATFORMS)[number]

export function isVerificationPlatform(value: string | null | undefined): value is VerificationPlatform {
  return (VERIFICATION_PLATFORMS as readonly string[]).includes(value ?? '')
}

/** Clean a submitted social profile/post URL: http(s) only, 8–500 chars. */
export function cleanProfileUrl(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null
  const url = raw.trim()
  if (url.length < 8 || url.length > 500) return null
  if (!/^https?:\/\//i.test(url)) return null
  return url
}

/**
 * Decide what the social editor page shows. Order matters: a kid is
 * refused even before the setup check, and a revoked creator goes
 * back to the submit form (their editor stays closed until the team
 * verifies a fresh link).
 */
export function socialEditorAccess(opts: {
  signedIn: boolean
  role: string | null
  status: CreatorVerificationStatus
  setupReady: boolean
}): SocialEditorAccess {
  if (!opts.signedIn) return { kind: 'signin' }
  if (opts.role === 'student') return { kind: 'kid' }
  if (!opts.setupReady) return { kind: 'setup' }
  if (opts.status === 'verified') return { kind: 'verified' }
  if (opts.status === 'pending') return { kind: 'pending' }
  return { kind: 'submit' }
}
