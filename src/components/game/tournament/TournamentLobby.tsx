// src/components/game/tournament/TournamentLobby.tsx

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import type { PlayerScore } from '@/lib/game/modes/types';

interface TournamentLobbyProps {
  tournamentName: string;
  registeredPlayers: PlayerScore[];
  maxPlayers?: number;
  onStart?: () => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export default function TournamentLobby({
  tournamentName,
  registeredPlayers,
  maxPlayers = 16,
  onStart,
  onCancel,
  isLoading = false,
}: TournamentLobbyProps): JSX.Element {
  const t = useTranslations('game');
  const canStart = registeredPlayers.length >= 2 && registeredPlayers.length % 2 === 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen p-4"
      style={{ background: 'var(--color-background)' }}
    >
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <h1
            className="text-4xl font-bold mb-2"
            style={{ color: 'var(--color-primary)' }}
          >
            🏆 {tournamentName}
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            {t('tournamentLobby')}
          </p>
        </motion.div>

        {/* Registered Players */}
        <motion.div
          className="rounded-lg p-6 mb-8"
          style={{ background: 'var(--color-surface)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2
            className="text-2xl font-bold mb-4"
            style={{ color: 'var(--color-primary)' }}
          >
            {t('registeredPlayers')} ({registeredPlayers.length}/{maxPlayers})
          </h2>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            <AnimatePresence>
              {registeredPlayers.length === 0 ? (
                <motion.p
                  className="text-center py-8"
                  style={{ color: 'var(--color-text-muted)' }}
                  key="empty"
                >
                  {t('waitingForPlayers')}
                </motion.p>
              ) : (
                registeredPlayers.map((player, index) => (
                  <motion.div
                    key={player.playerId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{
                      background: 'var(--color-surface-alt)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                        style={{
                          background: 'var(--color-primary)',
                          color: 'white',
                        }}
                      >
                        {index + 1}
                      </div>
                      <span style={{ color: 'var(--color-text-primary)' }}>
                        {player.nickname}
                      </span>
                    </div>
                    <motion.span
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      ✓
                    </motion.span>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          {/* Status Messages */}
          {canStart ? (
            <motion.p
              className="mt-4 p-3 rounded-lg text-center font-medium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                background: 'rgba(var(--color-success-rgb), 0.1)',
                color: 'var(--color-success)',
              }}
            >
              {t('readyToStart')}
            </motion.p>
          ) : registeredPlayers.length > 0 && registeredPlayers.length % 2 !== 0 ? (
            <motion.p
              className="mt-4 p-3 rounded-lg text-center font-medium"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                background: 'rgba(var(--color-warning-rgb), 0.1)',
                color: 'var(--color-warning)',
              }}
            >
              {t('needEvenPlayers')}
            </motion.p>
          ) : null}
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          className="flex gap-4 justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {onCancel && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onCancel}
              disabled={isLoading}
              className="px-6 py-3 rounded-lg font-bold"
              style={{
                background: 'var(--color-surface)',
                color: 'var(--color-text-primary)',
                border: '2px solid var(--color-border)',
              }}
            >
              {t('cancel')}
            </motion.button>
          )}

          {onStart && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onStart}
              disabled={!canStart || isLoading}
              className="px-8 py-3 rounded-lg font-bold text-white"
              style={{
                background: 'var(--color-primary)',
                opacity: !canStart || isLoading ? 0.5 : 1,
              }}
            >
              {isLoading ? t('starting') : `${t('start')} 🏆`}
            </motion.button>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
