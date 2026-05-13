'use client';

import { useMemo } from 'react';
import { useGameStore } from '@/lib/store/game';
import type { Card } from '@/lib/game/types';

interface RankInfo {
  value: number;
  label: string;
  initial: number;
}

const RANK_LIST: RankInfo[] = [
  { value: 14, label: 'A', initial: 8 },
  { value: 13, label: 'K', initial: 8 },
  { value: 12, label: 'Q', initial: 8 },
  { value: 11, label: 'J', initial: 8 },
  { value: 10, label: '10', initial: 8 },
  { value: 9, label: '9', initial: 8 },
  { value: 8, label: '8', initial: 8 },
  { value: 7, label: '7', initial: 8 },
  { value: 6, label: '6', initial: 8 },
  { value: 5, label: '5', initial: 8 },
  { value: 4, label: '4', initial: 8 },
  { value: 3, label: '3', initial: 8 },
  { value: 2, label: '2', initial: 8 },
  { value: 100, label: '小王', initial: 2 },
  { value: 200, label: '大王', initial: 2 },
];

function computeRemaining(hands: Card[][]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const rank of RANK_LIST) {
    counts.set(rank.value, rank.initial);
  }
  for (const hand of hands) {
    for (const card of hand) {
      const curr = counts.get(card.value);
      if (curr !== undefined) {
        counts.set(card.value, Math.max(0, curr - 1));
      }
    }
  }
  return counts;
}

export function CardCounter({ className }: { className?: string }) {
  const hands = useGameStore((s) => s.hands);
  const levelRank = useGameStore((s) => s.levelRank);
  const phase = useGameStore((s) => s.phase);

  const remainingMap = useMemo(() => computeRemaining(hands), [hands]);

  if (phase !== 'playing') return null;

  return (
    <div
      className={[
        'w-28 rounded-xl glass-dark border border-white/10 px-2.5 py-2.5 text-white',
        className,
      ].join(' ')}
    >
      <h3 className="mb-2 text-center text-[10px] font-semibold tracking-wider text-white/50">
        记牌器
      </h3>

      <div className="flex flex-col gap-y-0.5">
        {RANK_LIST.map((rank) => {
          const remaining = remainingMap.get(rank.value) ?? 0;
          const isLevelCard = rank.value <= 14 && levelRank === rank.value;
          const isZero = remaining === 0;
          const isCritical = remaining > 0 && remaining <= 2;
          const isFull = remaining === rank.initial;

          return (
            <div
              key={rank.value}
              className={[
                'flex items-center justify-between rounded px-1 py-0.5',
                isLevelCard ? 'bg-accent/20 ring-1 ring-accent/30' : '',
              ].join(' ')}
            >
              <span
                className={[
                  'text-[11px]',
                  isZero ? 'text-white/25 line-through' : '',
                  isCritical ? 'text-red-400 font-semibold' : '',
                  !isZero && !isCritical ? 'text-white/60' : '',
                ].join(' ')}
              >
                {rank.label}
              </span>

              <span
                className={[
                  'text-xs tabular-nums',
                  isZero ? 'text-white/25 line-through' : '',
                  isCritical ? 'text-red-400 font-bold' : '',
                  isFull && !isLevelCard ? 'text-white/40' : '',
                  !isZero && !isCritical && !isFull ? 'text-white/70' : '',
                  isLevelCard ? 'text-accent-light font-bold' : '',
                ].join(' ')}
              >
                {remaining}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
