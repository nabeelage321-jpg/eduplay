// src/components/game/AnswerFeedback.tsx

'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

interface AnswerFeedbackProps {
  isCorrect: boolean;
  pointsEarned: number;
  feedback: string;
  totalScore: number;
  onComplete?: () => void;
  duration?: number; // milliseconds
}

export default function AnswerFeedback({
  isCorrect,
  pointsEarned,
  feedback,
  totalScore,
  onComplete,
  duration = 2000,
}: AnswerFeedbackProps): JSX.Element {
  const t = useTranslations('game');

  useEffect(() => {
    if (!onComplete) return;
    const timer = setTimeout(onComplete, duration);
    return () => clearTimeout(timer);
  }, [onComplete, duration]);

  const bgColor = isCorrect
    ? 'var(--color-success)'
    : 'var(--color-danger)';
  const icon = isCorrect ? '✓' : '✗';
  const message = isCorrect ? t('correct') : t('incorrect');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ background: 'rgba(0, 0, 0, 0.5)' }}
    >
      <motion.div
        className="rounded-lg p-8 text-center text-white"
        style={{ background: bgColor }}
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 0.6, repeat: Infinity }}
      >
        {/* Icon */}
        <motion.div
          className="text-7xl mb-4"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.5 }}
        >
          {icon}
        </motion.div>

        {/* Message */}
        <motion.h2
          className="text-4xl font-bold mb-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {message}
        </motion.h2>

        {/* Feedback */}
        <motion.p
          className="text-lg mb-6 opacity-90"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {feedback}
        </motion.p>

        {/* Points */}
        {pointsEarned > 0 && (
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, type: 'spring' }}
          >
            <motion.div
              className="text-5xl font-bold"
              animate={{ y: [-20, 0] }}
              transition={{ duration: 0.5 }}
            >
              +{pointsEarned}
            </motion.div>
            <p className="text-sm opacity-75">{t('points')}</p>
          </motion.div>
        )}

        {/* Total Score */}
        <motion.div
          className="text-xl opacity-90"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {t('totalScore')}: <span className="font-bold">{totalScore}</span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
