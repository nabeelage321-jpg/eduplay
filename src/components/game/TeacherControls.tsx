// src/components/game/TeacherControls.tsx

'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

interface TeacherControlsProps {
  roomCode: string;
  playerCount: number;
  isPaused?: boolean;
  onPause?: () => Promise<void>;
  onResume?: () => Promise<void>;
  onSkipQuestion?: () => Promise<void>;
  onKickPlayer?: (playerId: string) => Promise<void>;
  onEndGame?: () => Promise<void>;
  isLoading?: boolean;
}

export default function TeacherControls({
  roomCode,
  playerCount,
  isPaused = false,
  onPause,
  onResume,
  onSkipQuestion,
  onKickPlayer,
  onEndGame,
  isLoading = false,
}: TeacherControlsProps): JSX.Element {
  const t = useTranslations('game');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-lg p-4 sticky bottom-0"
      style={{
        background: 'var(--color-surface)',
        boxShadow: '0 -4px 12px rgba(0,0,0,0.1)',
      }}
    >
      {/* Room Info */}
      <div className="flex items-center justify-between mb-4 pb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div>
          <p
            className="text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('roomCode')}: <span className="font-bold">{roomCode}</span>
          </p>
          <p
            className="text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('players')}: <span className="font-bold">{playerCount}</span>
          </p>
        </div>

        {isPaused && (
          <motion.div
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="px-3 py-1 rounded-full text-xs font-bold"
            style={{
              background: 'var(--color-warning)',
              color: 'white',
            }}
          >
            {t('paused')}
          </motion.div>
        )}
      </div>

      {/* Controls Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {/* Pause/Resume */}
        {isPaused ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onResume}
            disabled={isLoading}
            className="p-2 rounded-lg font-small transition-opacity text-xs md:text-sm"
            style={{
              background: 'var(--color-success)',
              color: 'white',
            }}
            aria-label={t('resume')}
          >
            ▶ {t('resume')}
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onPause}
            disabled={isLoading}
            className="p-2 rounded-lg font-small transition-opacity text-xs md:text-sm"
            style={{
              background: 'var(--color-warning)',
              color: 'white',
            }}
            aria-label={t('pause')}
          >
            ⏸ {t('pause')}
          </motion.button>
        )}

        {/* Skip Question */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onSkipQuestion}
          disabled={isLoading}
          className="p-2 rounded-lg font-small transition-opacity text-xs md:text-sm"
          style={{
            background: 'var(--color-primary)',
            color: 'white',
          }}
          aria-label={t('skip')}
        >
          ⏭ {t('skip')}
        </motion.button>

        {/* End Game */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onEndGame}
          disabled={isLoading}
          className="p-2 rounded-lg font-small transition-opacity text-xs md:text-sm"
          style={{
            background: 'var(--color-danger)',
            color: 'white',
          }}
          aria-label={t('endGame')}
        >
          ⏹ {t('endGame')}
        </motion.button>
      </div>
    </motion.div>
  );
}
