'use client';

import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/lib/store/game';
import { useRoomStore } from '@/lib/store/room';

const TOTAL_SECONDS = 30;

export function TurnTimer({ className }: { className?: string }) {
  const currentSeat = useGameStore((s) => s.currentSeat);
  const phase = useGameStore((s) => s.phase);
  const passTurn = useGameStore((s) => s.passTurn);
  const mySeat = useRoomStore((s) => s.mySeat);

  const [seconds, setSeconds] = useState(TOTAL_SECONDS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasPassedRef = useRef(false);

  const isMyTurn = phase === 'playing' && currentSeat === mySeat;

  useEffect(() => {
    if (!isMyTurn) return;

    setSeconds(TOTAL_SECONDS);
    hasPassedRef.current = false;

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [currentSeat, phase, mySeat, isMyTurn]);

  useEffect(() => {
    if (seconds !== 0 || !isMyTurn || hasPassedRef.current) return;

    hasPassedRef.current = true;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (mySeat !== null) passTurn(mySeat);
  }, [seconds, isMyTurn, mySeat, passTurn]);

  if (!isMyTurn) return null;

  const isWarning = seconds <= 10;
  const isDanger = seconds <= 5;

  return (
    <div
      role="timer"
      aria-live="polite"
      aria-label={`剩余出牌时间 ${seconds} 秒`}
      className={[
        'flex items-center justify-center rounded-full',
        'w-11 h-11 sm:w-12 sm:h-12',
        'glass-dark border border-white/10',
        'text-lg font-mono font-semibold tabular-nums leading-none',
        isDanger
          ? 'text-red-400 animate-pulse border-red-400/30'
          : isWarning
            ? 'text-amber-300'
            : 'text-white',
        className,
      ].join(' ')}
    >
      {seconds}
    </div>
  );
}
