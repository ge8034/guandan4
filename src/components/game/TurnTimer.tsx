'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useGameStore } from '@/lib/store/game';
import { useRoomStore } from '@/lib/store/room';
import { classifyHand } from '@/lib/game/rules';
import type { Card } from '@/lib/game/types';

const TOTAL_SECONDS = 30;

/** 找最小合法出牌 */
function findSmallestPlay(
  hand: Card[],
  lastPlay: { seatNo: number; cards: Card[] } | null,
  levelRank: number,
  mySeat: number,
): Card[] | null {
  if (hand.length === 0) return null;
  const sorted = [...hand].sort((a, b) => a.value - b.value);

  // 领牌或自己连续出牌：出最小单张
  if (!lastPlay || lastPlay.seatNo === mySeat) {
    return [sorted[0]];
  }

  // 跟牌：分析上家出牌类型
  const lastType = classifyHand(lastPlay.cards, levelRank);
  if (!lastType) return [sorted[0]]; // 兜底出最小单张

  const lastLen = lastPlay.cards.length;
  const lastValue = lastPlay.cards[0]?.value ?? 0;

  // 尝试同类型跟牌
  if (lastType.type === 'single') {
    const found = sorted.find((c) => c.value > lastValue);
    return found ? [found] : null;
  }
  if (lastType.type === 'pair' && lastLen === 2) {
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].value === sorted[i + 1].value && sorted[i].value > lastValue) {
        return [sorted[i], sorted[i + 1]];
      }
    }
    return null;
  }
  if (lastType.type === 'triple' && lastLen === 3) {
    for (let i = 0; i < sorted.length - 2; i++) {
      if (sorted[i].value === sorted[i + 1].value && sorted[i].value === sorted[i + 2].value && sorted[i].value > lastValue) {
        return [sorted[i], sorted[i + 1], sorted[i + 2]];
      }
    }
    return null;
  }

  // 复杂牌型兜底：尝试出最小单张
  const single = sorted.find((c) => c.value > lastValue);
  return single ? [single] : [sorted[0]];
}

export function TurnTimer({ className }: { className?: string }) {
  const currentSeat = useGameStore((s) => s.currentSeat);
  const phase = useGameStore((s) => s.phase);
  const passTurn = useGameStore((s) => s.passTurn);
  const playCards = useGameStore((s) => s.playCards);
  const hands = useGameStore((s) => s.hands);
  const lastPlay = useGameStore((s) => s.lastPlay);
  const levelRank = useGameStore((s) => s.levelRank);
  const mySeat = useRoomStore((s) => s.mySeat);

  const [seconds, setSeconds] = useState(TOTAL_SECONDS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasTriggeredRef = useRef(false);

  const isMyTurn = phase === 'playing' && currentSeat === mySeat;

  useEffect(() => {
    if (!isMyTurn) return;

    setSeconds(TOTAL_SECONDS);
    hasTriggeredRef.current = false;

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
    if (seconds !== 0 || !isMyTurn || hasTriggeredRef.current || mySeat === null) return;

    hasTriggeredRef.current = true;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const myHand = hands[mySeat] || [];
    const cards = findSmallestPlay(myHand, lastPlay, levelRank, mySeat);

    if (cards && cards.length > 0) {
      playCards(mySeat, cards);
    } else {
      passTurn(mySeat);
    }
  }, [seconds, isMyTurn, mySeat, hands, lastPlay, levelRank, playCards, passTurn]);

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
