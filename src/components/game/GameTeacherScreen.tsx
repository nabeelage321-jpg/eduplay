'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { useGameStore } from '@/lib/store/game-store'
import { useGameSocket } from '@/lib/hooks/useGameSocket'
import type { Activity } from '@/types'

interface GameTeacherScreenProps {
  activity: Activity
  roomCode: string
  locale: string
}

export default function GameTeacherScreen({ activity, roomCode, locale }: GameTeacherScreenProps) {
  const t = useTranslations('game')
  const { currentSession, updateSession, setCurrentQuestion } = useGameStore()
  const socket = useGameSocket({ enabled: true, roomCode })
  
  const [timeLeft, setTimeLeft] = useState(30)
  const [isShowingAnswers, setIsShowingAnswers] = useState(false)

  useEffect(() => {
    if (currentSession?.status !== 'active' || isShowingAnswers) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsShowingAnswers(true)
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [currentSession?.status, isShowingAnswers])

  const handleStartGame = () => {
    updateSession({ status: 'active' })
    socket?.emit('game:start', { roomCode })
  }

  const handleNextQuestion = () => {
    const nextQuestionIndex = (currentSession?.currentQuestion || 0) + 1
    setCurrentQuestion(nextQuestionIndex)
    setTimeLeft(30)
    setIsShowingAnswers(false)
    socket?.emit('game:question', { questionIndex: nextQuestionIndex })
  }

  const handleEndGame = () => {
    updateSession({ status: 'ended' })
    socket?.emit('game:end', { roomCode })
  }

  if (!currentSession) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-background)' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>{t('loading')}</p>
      </div>
    )
  }

  const currentQuestion = (activity.items ?? [])[currentSession.currentQuestion]
  const canStartGame = currentSession.playerCount > 0
  const canEndGame = currentSession.status === 'active'
  const canNextQuestion =
    isShowingAnswers && currentSession.currentQuestion < (activity.items?.length ?? 0) - 1

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Header with Room Code */}
      <div className="p-6 border-b" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
              {activity.title}
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              Room Code: <span className="font-mono font-bold text-lg">{roomCode}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{t('players')}</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>
              {currentSession.playerCount}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {currentSession.status === 'waiting' ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full flex flex-col items-center justify-center"
          >
            <div className="text-center">
              <h2 className="text-4xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                {t('waitingForPlayers')}
              </h2>
              <p className="text-xl mb-8" style={{ color: 'var(--color-text-secondary)' }}>
                {currentSession.playerCount > 0
                  ? t('readyToStart')
                  : t('needPlayers', { count: 1 - currentSession.playerCount })}
              </p>
              <div className="space-y-3">
                {currentSession.players.map((player) => (
                  <div
                    key={player.id}
                    className="px-6 py-3 rounded-lg"
                    style={{ backgroundColor: 'var(--color-surface)' }}
                  >
                    <p style={{ color: 'var(--color-text-primary)' }}>{player.nickname}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : currentSession.status === 'active' ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full flex flex-col justify-center"
          >
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                {currentQuestion?.prompt}
              </h2>
              <p className="text-lg" style={{ color: 'var(--color-text-secondary)' }}>
                {t('question')} {currentSession.currentQuestion + 1} {t('of')} {currentSession.totalQuestions}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {currentQuestion?.answers?.map((answer: string, index: number) => (
                <div
                  key={index}
                  className="p-6 rounded-lg"
                  style={{ backgroundColor: 'var(--color-surface)' }}
                >
                  <p className="text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                    {String.fromCharCode(65 + index)}
                  </p>
                  <p className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {answer}
                  </p>
                </div>
              ))}
            </div>

            <div className="text-center mb-8">
              <motion.div
                animate={{ scale: timeLeft <= 10 ? 1.1 : 1 }}
                className="text-6xl font-bold"
                style={{
                  color: timeLeft <= 10 ? 'var(--color-danger)' : 'var(--color-primary)',
                }}
              >
                {timeLeft}s
              </motion.div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-surface-alt)' }}>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Answered
                </p>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {currentSession.players.filter((p) => p.answered).length} / {currentSession.playerCount}
                </p>
              </div>
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-surface-alt)' }}>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Correct
                </p>
                <p className="text-2xl font-bold" style={{ color: 'var(--color-success)' }}>
                  {Math.floor(Math.random() * currentSession.playerCount)}
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full flex flex-col items-center justify-center"
          >
            <h2 className="text-4xl font-bold mb-8" style={{ color: 'var(--color-text-primary)' }}>
              {t('gameComplete')}
            </h2>
            <div className="space-y-3 w-full max-w-md">
              {currentSession.players
                .sort((a, b) => b.score - a.score)
                .map((player, index) => (
                  <div
                    key={player.id}
                    className="flex justify-between items-center p-4 rounded-lg"
                    style={{ backgroundColor: 'var(--color-surface)' }}
                  >
                    <span style={{ color: 'var(--color-text-primary)' }}>
                      #{index + 1} {player.nickname}
                    </span>
                    <span className="font-bold" style={{ color: 'var(--color-primary)' }}>
                      {player.score}
                    </span>
                  </div>
                ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Controls */}
      <div className="p-6 border-t" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <div className="flex gap-3">
          {currentSession.status === 'waiting' && (
            <button
              onClick={handleStartGame}
              disabled={!canStartGame}
              className="flex-1 py-3 rounded-lg font-semibold transition-opacity disabled:opacity-50"
              style={{
                backgroundColor: 'var(--color-primary)',
                color: 'white',
              }}
              aria-label={t('startGame')}
            >
              {t('startGame')}
            </button>
          )}
          {currentSession.status === 'active' && (
            <>
              <button
                onClick={handleNextQuestion}
                disabled={!canNextQuestion}
                className="flex-1 py-3 rounded-lg font-semibold transition-opacity disabled:opacity-50"
                style={{
                  backgroundColor: canNextQuestion ? 'var(--color-primary)' : 'var(--color-surface-alt)',
                  color: 'var(--color-text-primary)',
                }}
                aria-label="Next Question"
              >
                {currentSession.currentQuestion < (activity.items?.length ?? 0) - 1 ? 'Next Question' : 'Show Results'}
              </button>
              <button
                onClick={handleEndGame}
                className="px-6 py-3 rounded-lg font-semibold"
                style={{
                  backgroundColor: 'var(--color-danger)',
                  color: 'white',
                }}
                aria-label={t('endGame')}
              >
                {t('endGame')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
