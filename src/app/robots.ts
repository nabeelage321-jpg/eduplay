import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://eduplay-self.vercel.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',          // Never index API routes
          '/dashboard',     // Private teacher dashboard
          '*/play',         // Game screens — thin, non-indexable
          '/create',        // Creator tool
          '/_next/',        // Next.js internals
        ],
      },
      {
        // Explicitly allow Google Image Bot for og:image generation
        userAgent: 'Googlebot-Image',
        allow: '/',
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  }
}
