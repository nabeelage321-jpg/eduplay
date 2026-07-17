'use client'

import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'

interface CreatePageClientProps {
  locale?: string
}

export default function CreatePageClient({ locale }: CreatePageClientProps) {
  const t = useTranslations('create')

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--color-background)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
          {t('title')}
        </h1>
        <p className="text-lg mb-8" style={{ color: 'var(--color-text-secondary)' }}>
          {t('description')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Manual Mode */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="p-8 rounded-lg cursor-pointer"
            style={{ backgroundColor: 'var(--color-surface)' }}
          >
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              ✍️ {t('manualMode')}
            </h2>
            <p className="mb-6" style={{ color: 'var(--color-text-secondary)' }}>
              Create activities step-by-step with full control over every detail.
            </p>
            <button
              className="w-full py-3 rounded-lg font-semibold"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: 'white',
              }}
            >
              {t('createFirst')}
            </button>
          </motion.div>

          {/* AI Mode */}
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="p-8 rounded-lg cursor-pointer"
            style={{ backgroundColor: 'var(--color-surface)' }}
          >
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              🤖 {t('aiMode')}
            </h2>
            <p className="mb-6" style={{ color: 'var(--color-text-secondary)' }}>
              Let AI generate activities instantly based on your topic.
            </p>
            <button
              className="w-full py-3 rounded-lg font-semibold"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: 'white',
              }}
            >
              {t('aiMode')}
            </button>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
