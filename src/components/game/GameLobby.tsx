// src/components/game/GameLobby.tsx

'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import type { PlayerScore } from '@/lib/game/modes/types';
import QRCodeDisplay from './QRCodeDisplay';

interface GameLobbyProps {
  roomCode: string;
  players: PlayerScore[];
  mode: string;
  onStart: () => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  minPlayers?: number;
}

export default function GameLobby({
  roomCode,
  players,
  mode,
  onStart,
  onCancel,
  isLoading = false,
  minPlayers = 1,
}: GameLobbyProps): JSX.Element {
  const t = useTranslations('game');
  const [countdown, setCountdown] = useState<number | null>(null);

  // Auto-start countdown when enough players
  useEffect(() => {
    if (players.length >= minPlayers && countdown === null) {
      const timer = setTimeout(() => {
        setCountdown(5);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [players.length, minPlayers, countdown]);

  // Countdown timer
  useEffect(() => {
    if (countdown === null || countdown === 0) return;

    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  const canStart = players.length >= minPlayers;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen p-4"
      style={{ background: 'var(--color-background)' }}
    >
      <div className="max-w-4xl mx-auto">
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
            {t('lobby')}
          </h1>
          <p
            className="text-lg"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {t('mode')}: <span className="font-bold">{mode}</span>
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* QR Code Section */}
          <motion.div
            className="md:col-span-1"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div
              className="rounded-lg p-6"
              style={{ background: 'var(--color-surface)' }}
            >
              <QRCodeDisplay roomCode={roomCode} />
              <div
                className="mt-6 p-4 rounded-lg text-center"
                style={{
                  background: 'var(--color-surface-alt)',
                  color: 'var(--color-text-primary)',
                }}
              >
                <p
                  className="text-sm"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {t('orEnterCode')}
                </p>
                <p className="text-3xl font-bold font-mono mt-2 tracking-widest">
                  {roomCode}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Players Section */}
          <motion.div
            className="md:col-span-2"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div
              className="rounded-lg p-6"
              style={{ background: 'var(--color-surface)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-2xl font-bold"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {t('players')}
                </h2>
                <motion.div
                  className="text-2xl font-bold px-4 py-2 rounded-lg"
                  style={{
                    background: 'var(--color-primary)',
                    color: 'white',
                  }}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                >
                  {players.length}
                </motion.div>
              </div>

              {/* Player List */}
              <div className="space-y-2 max-h-80 overflow-y-auto">
                <AnimatePresence>
                  {players.length === 0 ? (
                    <motion.p
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-center py-8"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {t('waitingForPlayers')}
                    </motion.p>
                  ) : (
                    players.map((player, index) => (
                      <motion.div
                        key={player.playerId}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 20, opacity: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between p-3 rounded-lg"
                        style={{
                          background: 'var(--color-surface-alt)',
                          borderInlineStart: '3px solid var(--color-primary)',
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
                          <span
                            style={{
                              color: 'var(--color-text-primary)',
                            }}
                          >
                            {player.nickname}
                          </span>
                        </div>
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        >
                          ✓
                        </motion.div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>

              {/* Status Message */}
              {canStart && players.length >= minPlayers && (
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
              )}

              {!canStart && (
                <motion.p
                  className="mt-4 p-3 rounded-lg text-center font-medium"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    background: 'rgba(var(--color-warning-rgb), 0.1)',
                    color: 'var(--color-warning)',
                  }}
                >
                  {t('needPlayers', { count: minPlayers - players.length })}
                </motion.p>
              )}
            </div>
          </motion.div>
        </div>

        {/* Action Buttons */}
        <motion.div
          className="flex gap-4 justify-center mt-8"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onCancel}
            disabled={isLoading}
            className="px-6 py-3 rounded-lg font-bold transition-opacity"
            style={{
              background: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              border: '2px solid var(--color-border)',
            }}
            aria-label={t('cancel')}
          >
            {t('cancel')}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onStart}
            disabled={!canStart || isLoading}
            className="px-8 py-3 rounded-lg font-bold text-white transition-opacity"
            style={{
              background: 'var(--color-primary)',
              opacity: !canStart || isLoading ? 0.5 : 1,
            }}
            aria-label={t('startGame')}
          >
            {countdown !== null ? (
              <span>{countdown}</span>
            ) : isLoading ? (
              t('starting')
            ) : (
              t('startGame')
            )}
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
}
