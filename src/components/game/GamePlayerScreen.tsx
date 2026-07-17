'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/lib/store/game-store'
import { useGameSocket } from '@/lib/hooks/useGameSocket'
import type { Activity } from '@/types'

interface GamePlayerScreenProps {
  activity: Activity
  roomCode: string
  locale: string
}

export default function GamePlayerScreen({ activity, roomCode, locale }: GamePlayerScreenProps) {
  const t = useTranslations('game')
  const { currentSession, currentPlayer, updateScore, setCurrentQuestion } = useGameStore()
  const socket = useGameSocket({ enabled: true, roomCode })
  
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null)

  const currentQuestion = (activity.items ?? [])[currentSession?.currentQuestion || 0]

  const handleAnswerSelect = (index: number) => {
    if (!showFeedback) {
      setSelectedAnswer(index)
    }
  }

  const handleSubmit = async () => {
    if (selectedAnswer === null) return

    setIsSubmitting(true)

    // In real app, would verify against activity items
    const isCorrect = selectedAnswer === 0 // Mock: first answer is always correct

    setFeedback(isCorrect ? 'correct' : 'incorrect')
    setShowFeedback(true)

    if (isCorrect && currentPlayer) {
      updateScore(currentPlayer.id, (currentPlayer.score || 0) + 10)
      socket?.emit('game:answer', {
        playerId: currentPlayer.id,
        questionIndex: currentSession?.currentQuestion,
        answer: selectedAnswer,
        isCorrect: true,
        score: (currentPlayer.score || 0) + 10,
      })
    }

    setTimeout(() => {
      setIsSubmitting(false)
      if (currentSession && currentSession.currentQuestion < currentSession.totalQuestions - 1) {
        // Move to next question (teacher controls this)
        setTimeout(() => {
          setSelectedAnswer(null)
          setShowFeedback(false)
          setFeedback(null)
        }, 1500)
      }
    }, 1500)
  }

  if (!currentSession || !currentPlayer) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-background)' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>{t('loading')}</p>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <div className="flex justify-between items-center mb-3">
          <div>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{t('score')}</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>
              {currentPlayer.score}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{t('question')}</p>
            <p className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {currentSession.currentQuestion + 1} {t('of')} {currentSession.totalQuestions}
            </p>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2" style={{ backgroundColor: 'var(--color-surface-alt)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              backgroundColor: 'var(--color-primary)',
              width: `${((currentSession.currentQuestion + 1) / currentSession.totalQuestions) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Question Area */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col justify-center">
        <motion.div
          key={currentSession.currentQuestion}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-8" style={{ color: 'var(--color-text-primary)' }}>
            {currentQuestion?.prompt}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentQuestion?.answers?.map((answer: string, index: number) => (
              <motion.button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                disabled={showFeedback}
                className="p-6 rounded-lg font-semibold text-lg transition-all disabled:cursor-not-allowed"
                style={{
                  backgroundColor:
                    selectedAnswer === index && !showFeedback
                      ? 'var(--color-primary)'
                      : feedback && selectedAnswer === index && index === 0
                        ? 'var(--color-success)'
                        : feedback && selectedAnswer === index
                          ? 'var(--color-danger)'
                          : 'var(--color-surface)',
                  color:
                    selectedAnswer === index && !showFeedback ? 'white' : 'var(--color-text-primary)',
                  border: selectedAnswer === index ? 'none' : '2px solid var(--color-border)',
                }}
                whileHover={!showFeedback ? { scale: 1.02 } : {}}
                whileTap={!showFeedback ? { scale: 0.98 } : {}}
                aria-label={`Answer option ${index + 1}: ${answer}`}
              >
                <span className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full flex items-center justify-center font-bold">
                    {feedback && selectedAnswer === index ? (index === 0 ? '✓' : '✗') : String.fromCharCode(65 + index)}
                  </span>
                  {answer}
                </span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {showFeedback && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 flex items-center justify-center pointer-events-none"
          >
            <div
              className="px-8 py-4 rounded-lg font-bold text-white text-2xl"
              style={{
                backgroundColor: feedback === 'correct' ? 'var(--color-success)' : 'var(--color-danger)',
              }}
            >
              {feedback === 'correct' ? '✓ Correct!' : '✗ Incorrect'}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="p-6 border-t" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <button
          onClick={handleSubmit}
          disabled={selectedAnswer === null || isSubmitting}
          className="w-full py-4 rounded-lg font-semibold text-lg transition-opacity disabled:opacity-50"
          style={{
            backgroundColor: 'var(--color-primary)',
            color: 'white',
          }}
          aria-label={t('submitAnswer')}
        >
          {isSubmitting ? t('submitting') : t('submit')}
        </button>
      </div>
    </div>
  )
}
