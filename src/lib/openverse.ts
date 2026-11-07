// ─── Openverse image search (CC-licensed pictures, no key) ───────
// IMAGE PICKER 2026-11-07 (batch 1, batch-2 #7 + owner 13:17 PKT):
// teachers pick a picture for a game (Labelled Diagram first, then
// Picture Answer) from Openverse — api.openverse.org, free, no API
// key, every result CC-licensed or public domain by definition.
// HARD RULE (owner): a WRONG image must NEVER come through the
// system. So this is search-and-pick ONLY:
//   * the system NEVER auto-attaches an image to a game;
//   * results are CC-licensed only (explicit license list below),
//     relevance-ranked by Openverse for the teacher's search;
//   * results flagged mature by Openverse are dropped server-side;
//   * the TEACHER picks one picture, and the pick still goes through
//     the image-approval queue (migration 012) before the game can
//     go public — no picture is published without owner approval.
// Anonymous rate limit: 20 req/min, 200 req/day per IP. The route
// caches by query+page for 10 minutes so repeat searches do not
// burn the quota.

export interface OpenverseImage {
  id: string
  title: string
  url: string
  thumbnail: string
  pageUrl: string
  license: string
  licenseVersion: string
  creator: string
}

/** Every Creative Commons licence + public-domain marks Openverse serves. */
export const OPENVERSE_CC_LICENSES = [
  'by',
  'by-sa',
  'by-nc',
  'by-nc-sa',
  'by-nd',
  'by-nc-nd',
  'cc0',
  'pdm',
] as const

export function buildOpenverseSearchUrl(query: string, page = 1): string {
  const u = new URL('https://api.openverse.org/v1/images/')
  u.searchParams.set('q', query.trim())
  u.searchParams.set('license', [...OPENVERSE_CC_LICENSES].join(','))
  u.searchParams.set('license_type', 'all')
  u.searchParams.set('filter_dead', 'false')
  u.searchParams.set('page_size', '12')
  u.searchParams.set('page', String(Math.max(1, page)))
  return u.toString()
}

/**
 * Map one raw Openverse result, or null when it must never reach a
 * teacher: mature-flagged, or missing the picture itself. A result
 * without a thumbnail is unusable in the picker, so it is dropped
 * rather than shown as a broken tile.
 */
export function mapOpenverseResult(raw: unknown): OpenverseImage | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (r.mature === true) return null
  const url = typeof r.url === 'string' ? r.url : ''
  const thumbnail = typeof r.thumbnail === 'string' ? r.thumbnail : ''
  if (!url || !thumbnail) return null
  const license = typeof r.license === 'string' ? r.license.toUpperCase() : 'CC'
  const version = typeof r.license_version === 'string' ? r.license_version : ''
  return {
    id: String(r.id ?? url),
    title: typeof r.title === 'string' && r.title.trim() ? r.title.trim() : 'Untitled picture',
    url,
    thumbnail,
    pageUrl: typeof r.foreign_landing_url === 'string' ? r.foreign_landing_url : url,
    license,
    licenseVersion: version,
    creator: typeof r.creator === 'string' && r.creator.trim() ? r.creator : 'Unknown creator',
  }
}

/** Credit line stored with a picked picture, e.g. "Sunflower by Ana (CC BY 4.0)". */
export function openverseCredit(image: OpenverseImage): string {
  const version = image.licenseVersion ? ` ${image.licenseVersion}` : ''
  return `${image.title} by ${image.creator} (${image.license}${version})`
}
