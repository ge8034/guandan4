'use client';

import { PlayingCard, type CardData } from './PlayingCard';

interface HandAreaProps {
  cards: CardData[];
  selectedCardIds?: Set<number>;
  disabled?: boolean;
  loading?: boolean;
  playingIndices?: Set<number>;
  onCardClick?: (index: number) => void;
  lockedGroups?: number[][];
}

function CardSkeleton({ index }: { index: number }) {
  return (
    <div
      className="card-skeleton shrink-0"
      style={{
        marginLeft: index > 0 ? 'var(--card-overlap)' : '0',
        zIndex: index,
      }}
    />
  );
}

export function HandArea({
  cards,
  selectedCardIds,
  disabled = false,
  loading = false,
  playingIndices,
  onCardClick,
  lockedGroups,
}: HandAreaProps) {
  if (loading) {
    return (
      <div className="w-full overflow-x-auto">
        <div className="flex justify-center min-w-max px-2 py-4">
          {Array.from({ length: 13 }).map((_, i) => (
            <CardSkeleton key={i} index={i} />
          ))}
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="card-skeleton card-skeleton-sm"
                style={{ marginLeft: i > 0 ? '-0.6rem' : '0' }}
              />
            ))}
          </div>
          <p className="text-xs text-white/40">暂无手牌</p>
        </div>
      </div>
    );
  }

  // 构建渲染顺序：锁牌组置左（组内点数降序），其余按原顺序
  const lockedIndices = new Set(lockedGroups?.flat() || []);
  const lockedOrder = lockedGroups?.flatMap(g =>
    [...g].sort((a, b) => (cards[b]?.value ?? 0) - (cards[a]?.value ?? 0))
  ) || [];
  const unlockedOrder = cards
    .map((_, i) => i)
    .filter(i => !lockedIndices.has(i));

  const renderOrder = [...lockedOrder, ...unlockedOrder];
  // 渲染位置映射
  const renderIndexMap = new Map(renderOrder.map((origIdx, renderIdx) => [origIdx, renderIdx]));
  const isLocked = (idx: number) => lockedIndices.has(idx);

  return (
    <div className="w-full overflow-x-auto animate-fade-in-up">
      <div className="flex justify-center min-w-max px-2 py-4">
        {renderOrder.map((origIndex, renderIndex) => {
          const card = cards[origIndex];
          if (!card) return null;
          const isPlaying = playingIndices?.has(origIndex);
          const locked = isLocked(origIndex);

          return (
            <div
              key={`${card.suit}-${card.rank}-${origIndex}`}
              className={[
                'transition-all duration-200 ease-out',
                isPlaying && 'animate-fly-away',
                locked && '-translate-y-1.5',
              ].filter(Boolean).join(' ')}
              style={{
                marginLeft: renderIndex > 0 ? 'var(--card-overlap)' : '0',
                zIndex: renderIndex,
              }}
            >
              <div className={locked ? 'ring-2 ring-amber-400/60 rounded-lg' : ''}>
                <PlayingCard
                  card={card}
                  selected={selectedCardIds?.has(origIndex)}
                  disabled={disabled || isPlaying}
                  onClick={() => onCardClick?.(origIndex)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
