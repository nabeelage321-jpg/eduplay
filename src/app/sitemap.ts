import type { MetadataRoute } from 'next'
import {
  buildT1SitemapEntries,
  buildT2SitemapEntries,
  buildT3SitemapEntries,
  buildT8SitemapEntries,
} from '@/lib/seo/sitemap'
import { TOPIC_SLUGS } from '@/lib/supabase/seed/topics'
import { ALL_LOCALES } from '@/lib/seo/metadata'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://eduplay.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // ── Static home & core pages ──────────────────────────────────────────────
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

  // ── T1, T2, T3 (static params) ────────────────────────────────────────────
  const t1 = buildT1SitemapEntries()
  const t2 = buildT2SitemapEntries()
  const t3 = buildT3SitemapEntries()

  // ── T5: Topic pages ────────────────────────────────────────────────────────
  const t5: MetadataRoute.Sitemap = ALL_LOCALES.flatMap((locale) =>
    TOPIC_SLUGS.map((topic) => ({
      url: `${BASE_URL}/${locale}/topics/${topic}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  )

  // ── T8: Competitor alternatives ────────────────────────────────────────────
  const t8 = buildT8SitemapEntries()

  // NOTE: T4 (individual activities) and T7 (teacher profiles) use ISR and are
  // submitted to Google Search Console as URL inspection / auto-discovered from
  // internal links, not pre-generated in the main sitemap (they can be millions
  // of URLs). A separate Supabase-backed sitemap index can be added in Phase 6.

  return [
    ...corePages,
    ...t1,
    ...t2,
    ...t3,
    ...t5,
    ...t8,
  ]
}
