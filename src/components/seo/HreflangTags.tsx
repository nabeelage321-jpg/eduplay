/**
 * HreflangTags — renders <link rel="alternate" hreflang="..."> tags.
 * Use inside <head> via Next.js metadata API when possible.
 * This component is for cases where you need to render them manually.
 */

import { ALL_LOCALES } from '@/lib/seo/metadata'

import { getBaseUrl } from '@/lib/seo/base-url'

const BASE_URL = getBaseUrl()

interface HreflangTagsProps {
  /** The path AFTER the locale segment, e.g. "/activities/quiz" */
  path: string
}

export default function HreflangTags({ path }: HreflangTagsProps) {
  return (
    <>
      {ALL_LOCALES.map((locale) => (
        <link
          key={locale}
          rel="alternate"
          hrefLang={locale}
          href={`${BASE_URL}/${locale}${path}`}
        />
      ))}
      <link
        rel="alternate"
        hrefLang="x-default"
        href={`${BASE_URL}/en${path}`}
      />
    </>
  )
}
