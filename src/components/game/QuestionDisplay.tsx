// src/components/game/QuestionDisplay.tsx

'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import type { ChangeEvent, FormEvent } from 'react';

interface Question {
  id: string;
  prompt: string;
  options: string[];
  correctAnswer?: string;
  imageUrl?: string;
  hint?: string;
}

interface QuestionDisplayProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  timeLimit: number; // milliseconds
  onAnswer: (answer: string, timeTaken: number) => Promise<void>;
  onHint?: () => Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
}

export default function QuestionDisplay({
  question,
  questionIndex,
  totalQuestions,
  timeLimit,
  onAnswer,
  onHint,
  isLoading = false,
  disabled = false,
}: QuestionDisplayProps): JSX.Element {
  const t = useTranslations('game');
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<number>(timeLimit);
  const [startTime] = useState<number>(Date.now());
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [hintRequested, setHintRequested] = useState<boolean>(false);

  // Countdown timer
  useEffect(() => {
    if (timeRemaining <= 0 || isSubmitting) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 100) {
          return 0;
        }
        return prev - 100;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [timeRemaining, isSubmitting]);

  // Auto-submit on time up
  useEffect(() => {
    if (timeRemaining === 0 && selectedAnswer && !isSubmitting) {
      handleSubmit();
    }
  }, [timeRemaining, selectedAnswer, isSubmitting]);

  const handleAnswer = (e: ChangeEvent<HTMLDivElement>): void => {
    const target = e.target as HTMLInputElement;
    if (target.type === 'radio') {
      setSelectedAnswer(target.value);
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (!selectedAnswer || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const timeTaken = Date.now() - startTime;
      await onAnswer(selectedAnswer, timeTaken);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHintClick = async (): Promise<void> => {
    if (!onHint || hintRequested) return;
    setHintRequested(true);
    try {
      await onHint();
    } finally {
      // Note: hint itself is received via socket event
    }
  };

  const timePercentage = (timeRemaining / timeLimit) * 100;
  const isTimeRunningOut = timePercentage < 20;
  const timeSeconds = Math.ceil(timeRemaining / 1000);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen p-4 flex flex-col"
      style={{ background: 'var(--color-background)' }}
    >
      <div className="max-w-2xl mx-auto w-full flex flex-col flex-1">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div>
            <p
              className="text-sm font-medium"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('question')} {questionIndex + 1} {t('of')} {totalQuestions}
            </p>
            <motion.div
              className="w-48 h-2 rounded-full mt-2 overflow-hidden"
              style={{
                background: 'var(--color-surface)',
              }}
            >
              <motion.div
                className="h-full"
                style={{ background: 'var(--color-primary)' }}
                initial={{ width: '100%' }}
                animate={{
                  width: `${((questionIndex + 1) / totalQuestions) * 100}%`,
                }}
                transition={{ duration: 0.3 }}
              />
            </motion.div>
          </div>

          {/* Timer */}
          <motion.div
            className="text-center"
            animate={isTimeRunningOut ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.5, repeat: isTimeRunningOut ? Infinity : 0 }}
          >
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center font-bold text-2xl"
              style={{
                background: `hsl(${isTimeRunningOut ? 0 : 120}, 100%, 50%)`,
                color: 'white',
              }}
            >
              {timeSeconds}
            </div>
            <p
              className="text-xs mt-2"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('sec')}
            </p>
          </motion.div>
        </motion.div>

        {/* Question Card */}
        <motion.div
          className="rounded-lg p-8 mb-6 flex-1 flex flex-col"
          style={{
            background: 'var(--color-surface)',
          }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          {/* Question Image */}
          {question.imageUrl && (
            <motion.div
              className="mb-6 rounded-lg overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <img
                src={question.imageUrl}
                alt={t('questionImage')}
                className="w-full h-auto max-h-48 object-cover"
              />
            </motion.div>
          )}

          {/* Question Text */}
          <motion.h2
            className="text-2xl md:text-3xl font-bold mb-8"
            style={{ color: 'var(--color-text-primary)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {question.prompt}
          </motion.h2>

          {/* Answer Options */}
          <motion.div
            className="space-y-3 flex-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            onChange={handleAnswer}
          >
            {question.options.map((option, index) => (
              <motion.label
                key={index}
                className="block p-4 rounded-lg cursor-pointer transition-colors"
                style={{
                  background: 'var(--color-surface-alt)',
                  color: 'var(--color-text-primary)',
                  border:
                    selectedAnswer === option
                      ? '2px solid var(--color-primary)'
                      : '2px solid transparent',
                }}
                whileHover={{ scale: 1.02 }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="answer"
                    value={option}
                    checked={selectedAnswer === option}
                    disabled={disabled || isSubmitting}
                    className="w-5 h-5 cursor-pointer"
                    style={{
                      accentColor: 'var(--color-primary)',
                    }}
                    aria-label={`Option ${String.fromCharCode(65 + index)}: ${option}`}
                  />
                  <span className="font-medium">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  <span>{option}</span>
                </div>
              </motion.label>
            ))}
          </motion.div>
        </motion.div>

        {/* Hint & Submit */}
        <motion.div
          className="flex gap-4 justify-between items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {onHint && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleHintClick}
              disabled={hintRequested || isSubmitting || disabled}
              className="px-4 py-2 rounded-lg font-medium transition-opacity"
              style={{
                background: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
                border: '2px solid var(--color-border)',
                opacity: hintRequested ? 0.5 : 1,
              }}
              aria-label={t('hint')}
            >
              💡 {t('hint')}
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSubmit}
            disabled={!selectedAnswer || isSubmitting || disabled}
            className="flex-1 md:flex-none px-8 py-3 rounded-lg font-bold text-white transition-opacity"
            style={{
              background: 'var(--color-primary)',
              opacity: !selectedAnswer || isSubmitting || disabled ? 0.5 : 1,
            }}
            aria-label={t('submitAnswer')}
          >
            {isSubmitting ? t('submitting') : t('submit')}
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
}
