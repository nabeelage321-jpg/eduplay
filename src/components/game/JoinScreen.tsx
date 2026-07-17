// src/components/game/JoinScreen.tsx

'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import type { ChangeEvent, FormEvent } from 'react';

interface JoinScreenProps {
  onJoin: (roomCode: string, nickname: string) => Promise<void>;
  isLoading?: boolean;
  error?: string;
}

export default function JoinScreen({
  onJoin,
  isLoading = false,
  error,
}: JoinScreenProps): JSX.Element {
  const t = useTranslations('game');
  const [roomCode, setRoomCode] = useState<string>('');
  const [nickname, setNickname] = useState<string>('');
  const [localError, setLocalError] = useState<string>('');

  useEffect(() => {
    if (error) setLocalError(error);
  }, [error]);

  const handleRoomCodeChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setRoomCode(value);
    setLocalError('');
  };

  const handleNicknameChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setNickname(e.target.value.slice(0, 20));
    setLocalError('');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    if (roomCode.length !== 6) {
      setLocalError(t('invalidRoomCode'));
      return;
    }

    if (nickname.trim().length === 0) {
      setLocalError(t('enterNickname'));
      return;
    }

    try {
      await onJoin(roomCode, nickname.trim());
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : t('joinFailed'));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'var(--color-background)',
      }}
    >
      <div
        className="w-full max-w-md rounded-lg shadow-lg p-8"
        style={{
          background: 'var(--color-surface)',
          color: 'var(--color-text-primary)',
        }}
      >
        <motion.h1
          className="text-3xl font-bold text-center mb-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          style={{ color: 'var(--color-primary)' }}
        >
          {t('joinGame')}
        </motion.h1>

        <motion.p
          className="text-center text-sm mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {t('enterCodeNickname')}
        </motion.p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Room Code Input */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <label
              htmlFor="room-code"
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('roomCode')}
            </label>
            <input
              id="room-code"
              type="text"
              inputMode="numeric"
              placeholder="000000"
              value={roomCode}
              onChange={handleRoomCodeChange}
              maxLength={6}
              disabled={isLoading}
              className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest rounded-lg border-2 transition-colors focus:outline-none"
              style={{
                borderColor: 'var(--color-border)',
                background: 'var(--color-background)',
                color: 'var(--color-text-primary)',
              }}
              aria-label={t('roomCode')}
            />
            {roomCode.length === 6 && (
              <motion.p
                className="text-xs mt-2 font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ color: 'var(--color-success)' }}
              >
                ✓ {t('codeValid')}
              </motion.p>
            )}
          </motion.div>

          {/* Nickname Input */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <label
              htmlFor="nickname"
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {t('nickname')}
            </label>
            <input
              id="nickname"
              type="text"
              placeholder={t('enterNickname')}
              value={nickname}
              onChange={handleNicknameChange}
              maxLength={20}
              disabled={isLoading}
              className="w-full px-4 py-3 rounded-lg border-2 transition-colors focus:outline-none"
              style={{
                borderColor: 'var(--color-border)',
                background: 'var(--color-background)',
                color: 'var(--color-text-primary)',
              }}
              aria-label={t('nickname')}
            />
            <p
              className="text-xs mt-2"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {nickname.length}/20
            </p>
          </motion.div>

          {/* Error Message */}
          {localError && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-3 rounded-lg"
              style={{
                background: 'rgba(var(--color-danger-rgb), 0.1)',
                color: 'var(--color-danger)',
              }}
              role="alert"
            >
              {localError}
            </motion.div>
          )}

          {/* Submit Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isLoading || roomCode.length !== 6 || nickname.trim().length === 0}
            className="w-full py-3 rounded-lg font-bold text-lg transition-opacity"
            style={{
              background: 'var(--color-primary)',
              color: 'white',
              opacity:
                isLoading || roomCode.length !== 6 || nickname.trim().length === 0
                  ? 0.5
                  : 1,
            }}
            aria-label={t('joinButton')}
          >
            {isLoading ? t('joining') : t('joinButton')}
          </motion.button>
        </form>

        {/* Help Text */}
        <motion.p
          className="text-center text-xs mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{ color: 'var(--color-text-muted)' }}
        >
          {t('askTeacherCode')}
        </motion.p>
      </div>
    </motion.div>
  );
}
