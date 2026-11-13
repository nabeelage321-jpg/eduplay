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
          '/*/*/*/',        // TEMPORARY 2026-11-13: block game pages (/{locale}/{subject}/{grade}/{type}) — emergency brake, Vercel Fluid CPU 3h53m/4h. REMOVE after Hostinger move.
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
