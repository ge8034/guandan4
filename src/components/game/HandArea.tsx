'use client';

import { PlayingCard, type CardData } from './PlayingCard';

interface HandAreaProps {
  cards: CardData[];
  selectedCardIds?: Set<number>;
  disabled?: boolean;
  loading?: boolean;
  playingIndices?: Set<number>;
  onCardClick?: (index: number) => void;
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

  return (
    <div className="w-full overflow-x-auto animate-fade-in-up">
      <div className="flex justify-center min-w-max px-2 py-4">
        {cards.map((card, index) => {
          const isPlaying = playingIndices?.has(index);

          return (
            <div
              key={`${card.suit}-${card.rank}-${index}`}
              className={[
                'transition-all duration-200 ease-out',
                isPlaying && 'animate-fly-away',
              ].filter(Boolean).join(' ')}
              style={{
                marginLeft: index > 0 ? 'var(--card-overlap)' : '0',
                zIndex: index,
              }}
            >
              <PlayingCard
                card={card}
                selected={selectedCardIds?.has(index)}
                disabled={disabled || isPlaying}
                onClick={() => onCardClick?.(index)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
