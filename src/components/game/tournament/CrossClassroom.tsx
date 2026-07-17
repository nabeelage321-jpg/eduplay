// src/components/game/tournament/CrossClassroom.tsx

'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

interface Classroom {
  id: string;
  name: string;
  playerCount: number;
  ready: boolean;
}

interface CrossClassroomProps {
  classrooms: Classroom[];
  onStartTournament?: () => Promise<void>;
  isLoading?: boolean;
}

export default function CrossClassroom({
  classrooms,
  onStartTournament,
  isLoading = false,
}: CrossClassroomProps): JSX.Element {
  const t = useTranslations('game');
  const allReady = classrooms.every((c) => c.ready);
  const totalPlayers = classrooms.reduce((sum, c) => sum + c.playerCount, 0);

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
            {t('crossClassroomTournament')}
          </h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            {totalPlayers} {t('playersReady')}
          </p>
        </motion.div>

        {/* Classrooms Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {classrooms.map((classroom, index) => (
            <motion.div
              key={classroom.id}
              className="rounded-lg p-6"
              style={{
                background: 'var(--color-surface)',
                borderLeft: `4px solid ${classroom.ready ? 'var(--color-success)' : 'var(--color-warning)'}`,
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3
                    className="text-xl font-bold"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    {classroom.name}
                  </h3>
                  <p
                    className="text-sm"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {classroom.playerCount} {t('players')}
                  </p>
                </div>

                <motion.div
                  className="px-3 py-1 rounded-full text-xs font-bold"
                  style={{
                    background: classroom.ready ? 'var(--color-success)' : 'var(--color-warning)',
                    color: 'white',
                  }}
                  animate={
                    classroom.ready
                      ? {}
                      : { opacity: [1, 0.5, 1] }
                  }
                  transition={{ duration: 1.5, repeat: classroom.ready ? 0 : Infinity }}
                >
                  {classroom.ready ? '✓ Ready' : '⏳ Setting up'}
                </motion.div>
              </div>

              <div
                className="h-1 rounded-full overflow-hidden"
                style={{ background: 'var(--color-surface-alt)' }}
              >
                <motion.div
                  className="h-full"
                  style={{
                    background: classroom.ready ? 'var(--color-success)' : 'var(--color-warning)',
                  }}
                  animate={{
                    width: classroom.ready ? '100%' : '60%',
                  }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Start Button */}
        {onStartTournament && (
          <motion.div
            className="flex justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <motion.button
              whileHover={allReady ? { scale: 1.05 } : undefined}
              whileTap={allReady ? { scale: 0.95 } : undefined}
              onClick={onStartTournament}
              disabled={!allReady || isLoading}
              className="px-8 py-4 rounded-lg font-bold text-white text-lg"
              style={{
                background: 'var(--color-primary)',
                opacity: !allReady || isLoading ? 0.5 : 1,
              }}
            >
              {isLoading
                ? t('starting')
                : `${t('startTournament')} 🏆`}
            </motion.button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
