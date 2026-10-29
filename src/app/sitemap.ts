import type { MetadataRoute } from 'next'
import {
  SITEMAP_CHUNK_SIZE,
  buildAllSitemapEntries,
} from '@/lib/seo/sitemap-entries'

/**
 * SEO EMERGENCY (Batch 2, code only) — the previous single sitemap
 * listed 100,000+ URLs, over Google's 50,000-URL-per-sitemap limit.
 * Next.js `generateSitemaps` splits it into chunk files
 * (/sitemap/0.xml, /sitemap/1.xml, …), each capped at 40,000 URLs
 * (headroom under the 50,000 limit). The index at /sitemap.xml is
 * served by `src/app/sitemap.xml/route.ts` from the same entry list,
 * so index and chunks can never disagree on chunk count.
 *
 * NOTE — tension, stated honestly: the T2/T3 template pages are
 * noindexed (see their generateMetadata) because they currently show
 * no real activities, yet they remain listed here. That is the
 * emergency stop-gap the task asked for. The correct end-state is
 * one of: (a) put real activities on T2/T3 and remove their noindex,
 * or (b) drop T2/T3 from this sitemap entirely. Do not treat
 * "listed + noindexed" as a finished SEO state.
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
