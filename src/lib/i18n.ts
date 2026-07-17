import { getRequestConfig } from 'next-intl/server'
import { notFound } from 'next/navigation'
import type { SupportedLocale } from '@/types'

const locales: SupportedLocale[] = [
  'en', 'ur', 'ar', 'hi', 'es', 'fr', 'bn', 'pt', 'ru', 'id', 'zh'
]

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale

  if (!locale || !locales.includes(locale as SupportedLocale)) notFound()

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})