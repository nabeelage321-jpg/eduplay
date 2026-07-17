// src/components/game/LiveLeaderboard.tsx

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import type { PlayerScore } from '@/lib/game/modes/types';

interface LiveLeaderboardProps {
  players: PlayerScore[];
  maxDisplay?: number;
  showAccuracy?: boolean;
  compact?: boolean;
}

export default function LiveLeaderboard({
  players,
  maxDisplay = 10,
  showAccuracy = true,
  compact = false,
}: LiveLeaderboardProps): JSX.Element {
  const t = useTranslations('game');
  const [displayedPlayers, setDisplayedPlayers] = useState<PlayerScore[]>([]);
  const [prevScores, setPrevScores] = useState<Map<string, number>>(new Map());

  // Update displayed players and track score changes
  useEffect(() => {
    const rankedPlayers = [...players]
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, maxDisplay)
      .map((player, index) => ({
        ...player,
        rank: index + 1,
      }));

    // Track previous scores for animations
    const newPrevScores = new Map(prevScores);
    rankedPlayers.forEach((player) => {
      if (!newPrevScores.has(player.playerId)) {
        newPrevScores.set(player.playerId, player.totalScore);
      }
    });
    setPrevScores(newPrevScores);

    setDisplayedPlayers(rankedPlayers);
  }, [players, maxDisplay, prevScores]);

  const getMedalEmoji = (rank: number): string => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return '  ';
    }
  };

  const calculateAccuracy = (player: PlayerScore): number => {
    if (player.questionsAnswered === 0) return 0;
    return (player.correctAnswers / player.questionsAnswered) * 100;
  };

  if (compact) {
    return (
      <motion.div
        className="rounded-lg p-4"
        style={{ background: 'var(--color-surface)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <h3
          className="font-bold text-lg mb-4"
          style={{ color: 'var(--color-primary)' }}
        >
          {t('leaderboard')}
        </h3>

        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {displayedPlayers.map((player, index) => (
              <motion.div
                key={player.playerId}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-between p-2 rounded"
                style={{
                  background: 'var(--color-surface-alt)',
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg w-6">{getMedalEmoji(index + 1)}</span>
                  <span
                    className="text-sm font-medium flex-1"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {player.nickname}
                  </span>
                </div>
                <motion.span
                  className="font-bold text-sm"
                  style={{ color: 'var(--color-primary)' }}
                  key={`${player.playerId}-score`}
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.3 }}
                >
                  {player.totalScore}
                </motion.span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  }

  // Full leaderboard
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen p-4"
      style={{ background: 'var(--color-background)' }}
    >
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.h1
          className="text-4xl font-bold text-center mb-8"
          style={{ color: 'var(--color-primary)' }}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          {t('leaderboard')}
        </motion.h1>

        {/* Top 3 Podium */}
        {displayedPlayers.length >= 3 && (
          <motion.div
            className="grid grid-cols-3 gap-4 mb-8"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            {/* 2nd Place */}
            <motion.div
              className="text-center order-1"
              whileHover={{ scale: 1.05 }}
            >
              <motion.div
                className="rounded-t-lg p-4 mb-2"
                style={{
                  background: '#c0c0c0',
                  color: 'white',
                }}
              >
                <div className="text-4xl mb-2">🥈</div>
                <p className="font-bold text-lg">
                  {displayedPlayers[1].nickname}
                </p>
                <p
                  className="text-2xl font-bold"
                  style={{
                    color: 'rgba(0, 0, 0, 0.7)',
                  }}
                >
                  {displayedPlayers[1].totalScore}
                </p>
              </motion.div>
              <div
                className="h-16"
                style={{
                  background: 'var(--color-surface)',
                }}
              />
            </motion.div>

            {/* 1st Place */}
            <motion.div
              className="text-center order-2 -mt-4"
              whileHover={{ scale: 1.05 }}
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <motion.div
                className="rounded-t-lg p-6 mb-2"
                style={{
                  background: '#ffd700',
                  color: 'white',
                }}
              >
                <div className="text-5xl mb-2">🥇</div>
                <p className="font-bold text-xl">
                  {displayedPlayers[0].nickname}
                </p>
                <p
                  className="text-3xl font-bold"
                  style={{
                    color: 'rgba(0, 0, 0, 0.7)',
                  }}
                >
                  {displayedPlayers[0].totalScore}
                </p>
              </motion.div>
              <div
                className="h-24"
                style={{
                  background: 'var(--color-surface)',
                }}
              />
            </motion.div>

            {/* 3rd Place */}
            <motion.div
              className="text-center order-3"
              whileHover={{ scale: 1.05 }}
            >
              <motion.div
                className="rounded-t-lg p-4 mb-2"
                style={{
                  background: '#cd7f32',
                  color: 'white',
                }}
              >
                <div className="text-4xl mb-2">🥉</div>
                <p className="font-bold text-lg">
                  {displayedPlayers[2].nickname}
                </p>
                <p
                  className="text-2xl font-bold"
                  style={{
                    color: 'rgba(0, 0, 0, 0.7)',
                  }}
                >
                  {displayedPlayers[2].totalScore}
                </p>
              </motion.div>
              <div
                className="h-8"
                style={{
                  background: 'var(--color-surface)',
                }}
              />
            </motion.div>
          </motion.div>
        )}

        {/* Full Rankings */}
        <motion.div
          className="rounded-lg overflow-hidden"
          style={{
            background: 'var(--color-surface)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="overflow-x-auto">
            <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              <AnimatePresence mode="popLayout">
                {displayedPlayers.map((player, index) => (
                  <motion.div
                    key={player.playerId}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="p-4 flex items-center justify-between hover:opacity-75 transition-opacity"
                    style={{
                      background: index % 2 === 0 ? 'transparent' : 'var(--color-surface-alt)',
                    }}
                  >
                    {/* Rank & Name */}
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-3xl w-8">{getMedalEmoji(index + 1)}</div>
                      <div className="flex-1">
                        <p
                          className="font-bold"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {index + 1}. {player.nickname}
                        </p>
                        {showAccuracy && (
                          <p
                            className="text-xs"
                            style={{ color: 'var(--color-text-muted)' }}
                          >
                            {player.questionsAnswered} {t('questionsAnswered')}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="text-right">
                      <motion.div
                        className="text-2xl font-bold"
                        style={{ color: 'var(--color-primary)' }}
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 0.3 }}
                      >
                        {player.totalScore}
                      </motion.div>
                      {showAccuracy && (
                        <p
                          className="text-xs"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          {calculateAccuracy(player).toFixed(0)}% {t('accurate')}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* Total Players Count */}
        {players.length > maxDisplay && (
          <motion.p
            className="text-center mt-6"
            style={{ color: 'var(--color-text-secondary)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {t('totalPlayers')}: {players.length}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}
