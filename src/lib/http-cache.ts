// CDN caching for public read-only API routes (2026-11-10, owner order).
//
// Vercel Hobby Fluid Active CPU was at 3h 5m / 4h with zero real
// users, and NOT ONE of the 46 API routes set a Cache-Control header
// — every public list/browse/sitemap request re-ran its function.
// These values go on the 200 responses of PUBLIC, never-user-specific
// GETs only, so the Vercel Edge Network serves repeats instead of
// re-running the function.
//
// NEVER use these on: the activity detail route (audience-checked —
// a cached 200 could leak a private game, a cached 404 could hide
// it from its owner), /api/game-number (the response carries
// isOwner, which varies by signed-in user, and a cached 404 for a
// private game would hide it from its owner), anything session /
// live-room / auth / my-activities / saved-games (user-specific),
// anything POST/PUT/DELETE, prompt-to-game, video-to-game, chapter,
// or any route whose body varies by signed-in user. When in doubt,
// do NOT cache it.
export const PUBLIC_LIST_CACHE =
  'public, s-maxage=3600, stale-while-revalidate=86400'

// Sitemap index + chunks change only when the programme grid changes
// (a deploy), so a full day is safe.
export const SITEMAP_CACHE =
  'public, s-maxage=86400, stale-while-revalidate=86400'

// Top-10 scores move whenever a kid finishes a game (live rooms
// watch them), so keep the window short — one minute, with a
// five-minute stale window behind it.
export const LEADERBOARD_CACHE =
  'public, s-maxage=60, stale-while-revalidate=300'

// FOLLOW-UP 2026-11-10 — why round 1 did not reach the live edge:
//
// (1) Vercel strips `s-maxage` and `stale-while-revalidate` from the
//     `Cache-Control` it forwards to the browser UNLESS a
//     `CDN-Cache-Control` header is also set (Vercel CDN Cache docs:
//     "If you set Cache-Control without a CDN-Cache-Control, the
//     Vercel CDN strips s-maxage and stale-while-revalidate from the
//     response before sending it to the browser"). That is why live
//     showed bare `Cache-Control: public` even though the origin
//     sent the full value (proven locally: plain `next start`
//     returns the full header). Send BOTH headers with the same
//     value: the edge caches per `CDN-Cache-Control`, and the
//     browser then sees the full `Cache-Control`. Browsers ignore
//     `s-maxage`, so browser caching behaviour does not change.
// (2) `curl -sI` (HEAD) never returns a cache HIT from Vercel's
//     edge — repeat HEADs stay MISS with Age: 0 even while repeat
//     GETs of the same URL return HIT. Live verification of edge
//     caching MUST use GET, never HEAD.
export function publicCacheHeaders(value: string): Record<string, string> {
  return { 'Cache-Control': value, 'CDN-Cache-Control': value }
}
