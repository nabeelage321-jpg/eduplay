// src/components/game/QRCodeDisplay.tsx

'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

interface QRCodeDisplayProps {
  roomCode: string;
  size?: number;
}

export default function QRCodeDisplay({
  roomCode,
  size = 200,
}: QRCodeDisplayProps): JSX.Element {
  const t = useTranslations('game');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !roomCode) return;

    // Generate QR code using simple encoding
    // For production, use qrcode library: npm install qrcode
    // This is a placeholder - actual QR generation would be:
    // import QRCode from 'qrcode';
    // QRCode.toCanvas(canvasRef.current, `${baseUrl}/join?code=${roomCode}`, {...})

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw placeholder
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = '#000';
    ctx.font = `${size / 8}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(roomCode, size / 2, size / 2);
  }, [roomCode, size]);

  return (
    <motion.div
      className="flex flex-col items-center gap-4"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <h3
        className="font-bold text-lg"
        style={{ color: 'var(--color-primary)' }}
      >
        {t('scanToJoin')}
      </h3>

      <motion.canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="border-4 rounded-lg p-2"
        style={{
          borderColor: 'var(--color-primary)',
          background: 'white',
        }}
        whileHover={{ scale: 1.05 }}
      />

      <p
        className="text-xs text-center"
        style={{ color: 'var(--color-text-muted)' }}
      >
        {t('qrDescription')}
      </p>
    </motion.div>
  );
}
