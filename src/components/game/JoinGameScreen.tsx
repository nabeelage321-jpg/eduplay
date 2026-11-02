'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { useGameStore } from '@/lib/store/game-store'

interface JoinGameScreenProps {
  locale: string
}

export default function JoinGameScreen({ locale }: JoinGameScreenProps) {
  const t = useTranslations('game')
  const router = useRouter()
  const joinGame = useGameStore((state) => state.joinGame)

  const [roomCode, setRoomCode] = useState('')
  const [nickname, setNickname] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!roomCode.trim()) {
      setError('Room code is required')
      return
    }

    if (!nickname.trim()) {
      setError('Nickname is required')
      return
    }

    if (nickname.length > 20) {
      setError('Nickname must be 20 characters or less')
      return
    }

    setIsValidating(true)
    setError(null)

    // Join game — same destination as before (existing join flow, unchanged).
    joinGame(roomCode, nickname)
    router.push(`/${locale}/activity/0/play?roomCode=${roomCode}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--color-background)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="rounded-lg p-8" style={{ backgroundColor: 'var(--color-surface)' }}>
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            {t('joinGame')}
          </h1>
          <p className="mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            {t('enterCodeNickname')}
          </p>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="room-code" className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                {t('roomCode')}
              </label>
              <input
                id="room-code"
                type="text"
                value={roomCode}
                onChange={(e) => {
                  setRoomCode(e.target.value.toUpperCase())
                  setError(null)
                }}
                placeholder="E.g., ABC123"
                maxLength={6}
                className="w-full px-4 py-3 rounded-lg border-2 text-center text-2xl font-mono tracking-widest uppercase"
                style={{
                  borderColor: error ? 'var(--color-danger)' : 'var(--color-border)',
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text-primary)',
                  minHeight: 48,
                }}
                autoComplete="off"
                aria-label={t('roomCode')}
              />
              {roomCode && !error && (
                <p className="text-sm mt-2" style={{ color: 'var(--color-success)' }}>
                  ✓ {t('codeValid')}
                </p>
              )}
            </div>

            <div className="mb-4">
              <label htmlFor="nickname" className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
                {t('nickname')}
              </label>
              <input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value)
                  setError(null)
                }}
                placeholder={t('enterNickname')}
                maxLength={20}
                className="w-full px-4 py-3 rounded-lg border-2"
                style={{
                  borderColor: error ? 'var(--color-danger)' : 'var(--color-border)',
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text-primary)',
                  minHeight: 48,
                }}
                autoComplete="off"
                aria-label={t('nickname')}
              />
              <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                {nickname.length}/20
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'rgba(220, 38, 38, 0.1)', color: 'var(--color-danger)' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!roomCode || !nickname || isValidating}
              className="w-full py-3 rounded-lg font-semibold transition-opacity disabled:opacity-50"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: 'white',
                minHeight: 48,
              }}
              aria-label={t('joinButton')}
            >
              {isValidating ? t('joining') : t('joinButton')}
            </button>
          </form>

          <p className="text-center mt-6 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {t('askTeacherCode')}
          </p>
        </div>
      </motion.div>
    </div>
  )
}
