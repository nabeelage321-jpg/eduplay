// src/components/game/tournament/TournamentBracket.tsx

'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import type { TournamentBracket, TournamentMatch } from '@/lib/game/modes/types';

interface TournamentBracketProps {
  bracket: TournamentBracket;
  onMatchClick?: (matchId: string) => void;
  isLoading?: boolean;
}

export default function TournamentBracketComponent({
  bracket,
  onMatchClick,
  isLoading = false,
}: TournamentBracketProps): JSX.Element {
  const t = useTranslations('game');

  const getMatchStatus = (match: TournamentMatch): string => {
    if (match.status === 'completed' && match.winner) {
      return 'completed';
    }
    if (match.status === 'active') {
      return 'active';
    }
    return 'pending';
  };

  const getStatusColor = (
    status: string
  ): { bg: string; text: string } => {
    switch (status) {
      case 'completed':
        return {
          bg: 'var(--color-success)',
          text: 'white',
        };
      case 'active':
        return {
          bg: 'var(--color-warning)',
          text: 'white',
        };
      default:
        return {
          bg: 'var(--color-surface-alt)',
          text: 'var(--color-text-primary)',
        };
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full overflow-x-auto p-4"
      style={{ background: 'var(--color-background)' }}
    >
      <h2
        className="text-2xl font-bold mb-6"
        style={{ color: 'var(--color-primary)' }}
      >
        {bracket.name}
      </h2>

      <div className="flex flex-col gap-8">
        {bracket.rounds.map((round, roundIndex) => (
          <motion.div
            key={roundIndex}
            className="flex flex-col gap-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: roundIndex * 0.1 }}
          >
            <h3
              className="font-bold text-lg"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('round')} {round.roundNumber}
            </h3>

            <div className="space-y-4">
              {round.matches.map((match, matchIndex) => {
                const status = getMatchStatus(match);
                const colors = getStatusColor(status);

                return (
                  <motion.div
                    key={match.id}
                    whileHover={onMatchClick ? { scale: 1.02 } : undefined}
                    whileTap={
                      onMatchClick
                        ? { scale: 0.98 }
                        : undefined
                    }
                    onClick={
                      onMatchClick && !isLoading
                        ? () => onMatchClick(match.id)
                        : undefined
                    }
                    className="p-4 rounded-lg cursor-pointer"
                    style={{
                      background: colors.bg,
                      color: colors.text,
                    }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: matchIndex * 0.05 }}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {match.player1Id
                            ? `Player ${match.player1Id.slice(0, 8)}`
                            : t('pending')}
                        </span>
                        {status === 'completed' &&
                          match.winner === match.player1Id && (
                            <span className="text-lg">✓</span>
                          )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {match.player2Id
                            ? `Player ${match.player2Id.slice(0, 8)}`
                            : t('pending')}
                        </span>
                        {status === 'completed' &&
                          match.winner === match.player2Id && (
                            <span className="text-lg">✓</span>
                          )}
                      </div>
                    </div>

                    {status === 'active' && match.roomCode && (
                      <p className="text-xs mt-3 opacity-75">
                        {t('roomCode')}: {match.roomCode}
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
