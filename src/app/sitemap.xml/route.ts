import { NextResponse } from 'next/server'
import { getBaseUrl } from '@/lib/seo/base-url'
import { getSitemapChunkCount } from '@/lib/seo/sitemap-entries'
import { SITEMAP_CACHE, publicCacheHeaders } from '@/lib/http-cache'

/**
 * Sitemap index (Batch 2). Next.js 14.2's `generateSitemaps` only
 * serves the chunk files (/sitemap/0.xml, …) — it does NOT generate
 * a /sitemap.xml index on its own (verified locally: /sitemap.xml
 * 404'd before this route existed). This route fills that gap, and
 * robots.txt already points at /sitemap.xml, so crawlers land here.
 */
export async function GET() {
  const base = getBaseUrl()
  const chunks = getSitemapChunkCount()
  const entries = Array.from({ length: chunks }, (_, i) => {
    return `  <sitemap>\n    <loc>${base}/sitemap/${i}.xml</loc>\n  </sitemap>`
  }).join('\n')
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    entries +
    `\n</sitemapindex>\n`
  // CDN CACHE 2026-11-10: the index changes only when the programme
  // grid changes (a deploy) — crawlers ask for it constantly, so
  // serve repeats from the edge instead of re-running this route.
  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/xml', ...publicCacheHeaders(SITEMAP_CACHE) },
  })
}
