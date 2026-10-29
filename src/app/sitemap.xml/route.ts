import { NextResponse } from 'next/server'
import { getBaseUrl } from '@/lib/seo/base-url'
import { getSitemapChunkCount } from '@/lib/seo/sitemap-entries'

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
  return new NextResponse(xml, {
    headers: { 'Content-Type': 'application/xml' },
  })
}
