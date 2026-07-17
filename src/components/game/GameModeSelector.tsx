// src/components/game/GameModeSelector.tsx

'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { GAME_MODE_CONFIGS } from '@/lib/game/utils';
import type { GameModeType } from '@/lib/game/modes/types';

interface GameModeSelectorProps {
  selectedMode: GameModeType;
  onSelect: (mode: GameModeType) => void;
  disabled?: boolean;
}

export default function GameModeSelector({
  selectedMode,
  onSelect,
  disabled = false,
}: GameModeSelectorProps): JSX.Element {
  const t = useTranslations('game');
  const modes = Object.values(GAME_MODE_CONFIGS);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      <h3
        className="text-lg font-bold mb-4"
        style={{ color: 'var(--color-primary)' }}
      >
        {t('selectGameMode')}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
        {modes.map((mode, index) => (
          <motion.button
            key={mode.id}
            onClick={() => onSelect(mode.id as GameModeType)}
            disabled={disabled}
            className="p-4 rounded-lg text-left transition-colors"
            style={{
              background:
                selectedMode === mode.id
                  ? 'var(--color-primary)'
                  : 'var(--color-surface-alt)',
              color:
                selectedMode === mode.id
                  ? 'white'
                  : 'var(--color-text-primary)',
              border:
                selectedMode === mode.id
                  ? 'none'
                  : '2px solid var(--color-border)',
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <p className="font-bold text-sm">{mode.name}</p>
            <p className="text-xs opacity-75 mt-1">{mode.description}</p>
            <p className="text-xs opacity-50 mt-2">
              {mode.minPlayers}-{mode.maxPlayers} {t('players')}
            </p>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
