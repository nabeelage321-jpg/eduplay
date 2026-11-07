import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/lib/i18n.ts')

const nextConfig = {
  images: {
    domains: ['your-supabase-url.supabase.co'],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  async redirects() {
    return [
      {
        // Legacy play route is stuck ("Lets Play" does nothing, owner
        // 2026-11-07) and the legacy player has other known bugs — the
        // owner chose REDIRECT, not a button fix. Every legacy play URL
        // goes to the new play page, keeping the locale prefix.
        source: '/:locale/play/:id',
        destination: '/:locale/activity/:id/play',
        permanent: true,
      },
    ]
  },
}

export default withNextIntl(nextConfig)