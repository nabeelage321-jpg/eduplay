import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'
import type { SupportedLocale } from '@/types'
import { RTL_LOCALES } from '@/types'
import '@/styles/globals.css'

const locales: SupportedLocale[] = [
  'en', 'ur', 'ar', 'hi', 'es', 'fr', 'bn', 'pt', 'ru', 'id', 'zh'
]

interface RootLayoutProps {
  children: React.ReactNode
  params: { locale: string }
}

export async function generateMetadata({
  params: { locale }
}: RootLayoutProps): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'seo' })
  return {
    title: { default: t('homePage'), template: '%s | EduPlay' },
    description: t('homePageDesc'),
    metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? 'https://eduplay.com'),
    openGraph: {
      siteName: 'EduPlay',
      locale,
      type: 'website',
    },
    robots: { index: true, follow: true },
    verification: {
      google: 'nrQfXDbfR7qFDIjiFgoF47jMFAa8myV4cVgzyKtlU64',
    },
  }
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: RootLayoutProps) {
  if (!locales.includes(locale as SupportedLocale)) notFound()
  const messages = await getMessages()
  const direction = RTL_LOCALES.includes(locale as SupportedLocale) ? 'rtl' : 'ltr'
  return (
    <html
      lang={locale}
      dir={direction}
      data-theme="ladies"
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('edtech-theme');
                  if (stored) {
                    var data = JSON.parse(stored);
                    var state = data.state;
                    if (state && state.audience) {
                      document.documentElement.setAttribute('data-theme', state.audience);
                      if (state.audience === 'kids' && state.kidsTheme) {
                        document.documentElement.setAttribute('data-kids-theme', state.kidsTheme);
                      }
                    }
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="theme-transition antialiased" suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
