'use client';

import { useRef, useCallback } from 'react';
import { PlayingCard, type CardData } from './PlayingCard';

interface HandAreaProps {
  cards: CardData[];
  selectedCardIds?: Set<number>;
  disabled?: boolean;
  loading?: boolean;
  playingIndices?: Set<number>;
  onCardClick?: (index: number) => void;
  lockedGroups?: CardData[][];
  onDragSelect?: (indices: number[]) => void;
  onDeselectAll?: () => void;
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
  onDragSelect,
  onDeselectAll,
}: HandAreaProps) {
  const draggingRef = useRef(false);
  const dragSet = useRef<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const card = el?.closest?.('[data-hand-index]') as HTMLElement | null;
    if (!card) {
      onDeselectAll?.();
      return;
    }
    draggingRef.current = true;
    dragSet.current = new Set();
  }, [disabled, onDeselectAll]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onDeselectAll?.();
  }, [onDeselectAll]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingRef.current) return;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const card = el?.closest?.('[data-hand-index]') as HTMLElement | null;
    if (card) {
      dragSet.current.add(Number(card.getAttribute('data-hand-index')));
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (dragSet.current.size > 0) {
      onDragSelect?.(Array.from(dragSet.current));
    }
  }, [onDragSelect]);
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

  // 锁牌组置左：通过牌对象引用找到各锁定牌在当前手牌中的索引
  const lockedCardSet = new Set(lockedGroups?.flatMap(g => g) || []);
  const lockedIndices = new Set(
    cards
      .map((c, i) => (lockedCardSet.has(c) ? i : -1))
      .filter(i => i !== -1)
  );
  const unlockedIndices = cards.map((_, i) => i).filter(i => !lockedIndices.has(i));

  let renderSeq = 0;
  const nextSeq = () => renderSeq++;

  return (
    <div className="w-full overflow-x-auto animate-fade-in-up select-none">
      <div
        ref={containerRef}
        className="flex justify-center min-w-max px-2 py-4"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={handleContextMenu}
      >
        {/* 锁牌组 — 每组一个蓝色边框包裹 */}
        {lockedGroups?.map((group, gi) => {
          // 将牌对象转回当前手牌中的索引
          const indices = group.map(c => cards.indexOf(c)).filter(i => i !== -1);
          if (indices.length === 0) return null;
          const sorted = [...indices].sort((a, b) => (cards[b]?.value ?? 0) - (cards[a]?.value ?? 0));
          return (
            <div
              key={`lock-${gi}`}
              className={`flex items-end -translate-y-1.5 ${gi > 0 ? '-ml-[19px]' : ''}`}
            >
              <div className="flex ring-2 ring-blue-400/50 rounded-lg px-0.5 py-0.5">
                {sorted.map((origIndex) => {
                  const card = cards[origIndex];
                  if (!card) return null;
                  const seq = nextSeq();
                  return (
                    <div
                      key={`${card.suit}-${card.rank}-${origIndex}`}
                      data-hand-index={origIndex}
                      className="transition-all duration-200 ease-out"
                      style={{
                        marginLeft: sorted.indexOf(origIndex) > 0 ? 'var(--card-overlap)' : '0',
                        zIndex: seq,
                      }}
                    >
                      <PlayingCard
                        card={card}
                        selected={selectedCardIds?.has(origIndex)}
                        disabled={disabled}
                        onClick={() => onCardClick?.(origIndex)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* 未锁定牌 */}
        {unlockedIndices.map((origIndex) => {
          const card = cards[origIndex];
          if (!card) return null;
          const isPlaying = playingIndices?.has(origIndex);
          const seq = nextSeq();

          return (
            <div
              key={`${card.suit}-${card.rank}-${origIndex}`}
              data-hand-index={origIndex}
              className={[
                'transition-all duration-200 ease-out',
                isPlaying && 'animate-fly-away',
              ].filter(Boolean).join(' ')}
              style={{
                marginLeft: seq > 0 ? 'var(--card-overlap)' : '0',
                zIndex: seq,
              }}
            >
              <PlayingCard
                card={card}
                selected={selectedCardIds?.has(origIndex)}
                disabled={disabled || isPlaying}
                onClick={() => onCardClick?.(origIndex)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
