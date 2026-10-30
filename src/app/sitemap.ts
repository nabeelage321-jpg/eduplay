import type { MetadataRoute } from 'next'
import {
  SITEMAP_CHUNK_SIZE,
  buildAllSitemapEntries,
} from '@/lib/seo/sitemap-entries'

/**
 * Sitemap (2026-10-30 SEO batch) — core + browse + programmatic
 * pages with real games only (T1/T2/T3 on the 15-subject DB grid),
 * 57,222 URLs in total. Next.js `generateSitemaps` splits it into
 * chunk files (/sitemap/0.xml, /sitemap/1.xml, …), each capped at
 * 40,000 URLs (headroom under the 50,000 limit). The index at
 * /sitemap.xml is served by `src/app/sitemap.xml/route.ts` from the
 * same entry list, so index and chunks can never disagree on chunk
 * count. Pages with zero real games are noindex AND excluded here.
 */
export { SITEMAP_CHUNK_SIZE }

export async function generateSitemaps() {
  const total = buildAllSitemapEntries().length
  const chunks = Math.ceil(total / SITEMAP_CHUNK_SIZE)
  return Array.from({ length: chunks }, (_, i) => ({ id: i }))
}

export default async function sitemap({
  id,
}: {
  id: number
}): Promise<MetadataRoute.Sitemap> {
  const all = buildAllSitemapEntries()
  const start = id * SITEMAP_CHUNK_SIZE
  return all.slice(start, start + SITEMAP_CHUNK_SIZE)
}
