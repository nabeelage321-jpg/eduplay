import { BrowseClient } from './BrowseClient'

export const metadata = {
  title: 'Browse Educational Games | EduPlay',
  description: 'Browse and play interactive educational games for all grades',
}

export default function BrowsePage({ params }: { params: { locale: string } }) {
  return <BrowseClient locale={params.locale} />
}
