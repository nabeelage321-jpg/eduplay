// src/components/game/FinalResults.tsx

'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import type { PlayerScore } from '@/lib/game/modes/types';

interface FinalResultsProps {
  finalLeaderboard: PlayerScore[];
  mode: string;
  questionsPlayed: number;
  duration: number; // milliseconds
  onReturnHome: () => void;
  onShareResults?: () => Promise<void>;
  onExportResults?: () => Promise<void>;
}

export default function FinalResults({
  finalLeaderboard,
  mode,
  questionsPlayed,
  duration,
  onReturnHome,
  onShareResults,
  onExportResults,
}: FinalResultsProps): JSX.Element {
  const t = useTranslations('game');

  const durationMinutes = Math.floor(duration / 60000);
  const durationSeconds = Math.floor((duration % 60000) / 1000);

  const getMedal = (rank: number): string => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen p-4"
      style={{ background: 'var(--color-background)' }}
    >
      <div className="max-w-3xl mx-auto">
        {/* Celebration */}
        <motion.div
          className="text-center mb-8"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
        >
          <div className="text-7xl mb-4">🎉</div>
          <h1
            className="text-4xl font-bold mb-2"
            style={{ color: 'var(--color-primary)' }}
          >
            {t('gameComplete')}
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            {questionsPlayed} {t('questions')} • {durationMinutes}:{durationSeconds.toString().padStart(2, '0')}
          </p>
        </motion.div>

        {/* Podium */}
        {finalLeaderboard.length >= 1 && (
          <motion.div
            className="grid grid-cols-3 gap-4 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {/* 2nd */}
            {finalLeaderboard.length >= 2 && (
              <motion.div
                className="text-center"
                whileHover={{ y: -5 }}
              >
                <motion.div
                  className="rounded-t-lg p-4 mb-2"
                  style={{ background: '#c0c0c0', color: 'white' }}
                >
                  <div className="text-4xl mb-2">🥈</div>
                  <p className="font-bold">{finalLeaderboard[1].nickname}</p>
                  <p className="text-2xl font-bold">
                    {finalLeaderboard[1].totalScore}
                  </p>
                </motion.div>
                <div
                  style={{ background: 'var(--color-surface)' }}
                  className="h-16"
                />
              </motion.div>
            )}

            {/* 1st */}
            <motion.div
              className="text-center -mt-8"
              animate={{ y: [0, -20, 0] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              <motion.div
                className="rounded-t-lg p-6 mb-2"
                style={{ background: '#ffd700', color: 'white' }}
              >
                <div className="text-5xl mb-2">🏆</div>
                <p className="font-bold text-lg">{finalLeaderboard[0].nickname}</p>
                <p className="text-3xl font-bold">
                  {finalLeaderboard[0].totalScore}
                </p>
              </motion.div>
              <div
                style={{ background: 'var(--color-surface)' }}
                className="h-28"
              />
            </motion.div>

            {/* 3rd */}
            {finalLeaderboard.length >= 3 && (
              <motion.div
                className="text-center"
                whileHover={{ y: -5 }}
              >
                <motion.div
                  className="rounded-t-lg p-4 mb-2"
                  style={{ background: '#cd7f32', color: 'white' }}
                >
                  <div className="text-4xl mb-2">🥉</div>
                  <p className="font-bold">{finalLeaderboard[2].nickname}</p>
                  <p className="text-2xl font-bold">
                    {finalLeaderboard[2].totalScore}
                  </p>
                </motion.div>
                <div
                  style={{ background: 'var(--color-surface)' }}
                  className="h-8"
                />
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Full Rankings */}
        <motion.div
          className="rounded-lg p-6 mb-8"
          style={{ background: 'var(--color-surface)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <h2
            className="text-2xl font-bold mb-4"
            style={{ color: 'var(--color-primary)' }}
          >
            {t('finalRankings')}
          </h2>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {finalLeaderboard.map((player, index) => (
              <motion.div
                key={player.playerId}
                className="flex items-center justify-between p-3 rounded-lg"
                style={{
                  background: 'var(--color-surface-alt)',
                }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.05 }}
              >
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-2xl w-6">{getMedal(index + 1)}</span>
                  <div>
                    <p
                      className="font-bold"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {index + 1}. {player.nickname}
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {player.correctAnswers}/{player.questionsAnswered} {t('correct')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className="text-xl font-bold"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    {player.totalScore}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          className="flex flex-col md:flex-row gap-3 justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          {onExportResults && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onExportResults}
              className="px-6 py-3 rounded-lg font-bold"
              style={{
                background: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
                border: '2px solid var(--color-border)',
              }}
            >
              📊 {t('export')}
            </motion.button>
          )}

          {onShareResults && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onShareResults}
              className="px-6 py-3 rounded-lg font-bold"
              style={{
                background: 'var(--color-primary)',
                color: 'white',
              }}
            >
              📤 {t('share')}
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onReturnHome}
            className="px-6 py-3 rounded-lg font-bold"
            style={{
              background: 'var(--color-primary)',
              color: 'white',
            }}
          >
            🏠 {t('backHome')}
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
}
