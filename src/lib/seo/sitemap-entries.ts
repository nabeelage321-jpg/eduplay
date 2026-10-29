import type { MetadataRoute } from 'next'
import {
  buildT1SitemapEntries,
  buildT2SitemapEntries,
  buildT3SitemapEntries,
  buildT8SitemapEntries,
} from './sitemap'
import { TOPIC_SLUGS } from '@/lib/supabase/seed/topics'
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
      url: `${BASE_URL}/${locale}/create`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
  ])

  const t1 = buildT1SitemapEntries()
  const t2 = buildT2SitemapEntries()
  const t3 = buildT3SitemapEntries()

  const t5: MetadataRoute.Sitemap = ALL_LOCALES.flatMap((locale) =>
    TOPIC_SLUGS.map((topic) => ({
      url: `${BASE_URL}/${locale}/topics/${topic}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  )

  const t8 = buildT8SitemapEntries()

  // NOTE: T4 (individual activities) and T7 (teacher profiles) use ISR
  // and are submitted to Google Search Console as URL inspection /
  // auto-discovered from internal links, not pre-generated in the main
  // sitemap (they can be millions of URLs).
  return [...corePages, ...t1, ...t2, ...t3, ...t5, ...t8]
}

export function getSitemapChunkCount(): number {
  return Math.ceil(buildAllSitemapEntries().length / SITEMAP_CHUNK_SIZE)
}
