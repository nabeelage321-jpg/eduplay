import createMiddleware from 'next-intl/middleware'

export default createMiddleware({
  locales: ['en', 'ur', 'ar', 'hi', 'es', 'fr', 'bn', 'pt', 'ru', 'id', 'zh'],
  defaultLocale: 'en',
  localePrefix: 'always',
})

export const config = {
  matcher: [
    '/((?!_next|_vercel|api|.*\\..*).*)',
    '/'
  ]
}