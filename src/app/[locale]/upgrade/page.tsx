import { Metadata } from 'next'
import { useTranslations } from 'next-intl'
import UpgradePage from '@/components/upgrade/UpgradePage'

interface PageProps {
  params: {
    locale: string
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: 'Upgrade to Premium | EduPlay',
    description: 'Unlock unlimited activities, AI generations, and live games with EduPlay Premium',
    alternates: {
      canonical: `https://edplay.com/${params.locale}/upgrade`,
    },
  }
}

export default function Page({ params }: PageProps) {
  return <UpgradePage locale={params.locale} />
}
