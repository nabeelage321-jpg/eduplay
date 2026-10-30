import type { MetadataRoute } from 'next'
import {
  buildT1SitemapEntries,
  buildT2SitemapEntries,
  buildT3SitemapEntries,
} from './sitemap'
import { ALL_LOCALES } from './metadata'
import { getBaseUrl } from './base-url'

/**
 * Shared sitemap entry list (Batch 2). Both `src/app/sitemap.ts`
 * (chunk files) and `src/app/sitemap.xml/route.ts` (the index) use
 * this, so the index can never list a different number of chunks
 * than the chunks that actually exist.
 */
export const SITEMAP_CHUNK_SIZE = 40000

export function buildAllSitemapEntries(): MetadataRoute.Sitemap {
  const BASE_URL = getBaseUrl()
  const corePages: MetadataRoute.Sitemap = ALL_LOCALES.flatMap((locale) => [
    {
      url: `${BASE_URL}/${locale}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/${locale}/activities`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/${locale}/browse`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/${locale}/create`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
  ])

  // 2026-10-30 SEO batch: sitemap = core + browse + programmatic pages
  // with real games ONLY (T1/T2/T3 on the 15-subject DB grid). Topic
  // (T5) and competitor-alternative (T8) pages are NOT listed here:
  // they do not render real games, so listing them would re-create
  // the thin-URL problem this batch removes. T4 (individual
  // activities) and T7 (teacher profiles) are auto-discovered from
  // internal links, not pre-generated.
  const t1 = buildT1SitemapEntries()
  const t2 = buildT2SitemapEntries()
  const t3 = buildT3SitemapEntries()

  return [...corePages, ...t1, ...t2, ...t3]
}

export function getSitemapChunkCount(): number {
  return Math.ceil(buildAllSitemapEntries().length / SITEMAP_CHUNK_SIZE)
}
