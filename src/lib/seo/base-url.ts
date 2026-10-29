/**
 * Batch 1 — central base URL.
 *
 * The live site today is https://eduplay-self.vercel.app. A custom domain
 * later is ONE env-var change: set NEXT_PUBLIC_BASE_URL in Vercel (or
 * .env.local for local dev) and rebuild. Do not hardcode a new domain
 * across the SEO files — change it here / via the env var only.
 */
// GUARD 2026-10-29: eduplay.app is NOT owned by the owner. Never set
// NEXT_PUBLIC_BASE_URL to eduplay.app or any of its subdomains; the
// only live URL is https://eduplay-self.vercel.app until a custom
// domain is actually owned and verified.
export const FALLBACK_BASE_URL = 'https://eduplay-self.vercel.app'

export function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? FALLBACK_BASE_URL
}
