'use client';

import { useRef, useState, useCallback } from 'react';
import { PlayingCard, type CardData } from './PlayingCard';

interface HandAreaProps {
  cards: CardData[];
  selectedCardIds?: Set<number>;
  disabled?: boolean;
  loading?: boolean;
  playingIndices?: Set<number>;
  onCardClick?: (index: number) => void;
  lockedGroups?: number[][];
  onDragSelect?: (indices: number[]) => void;
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
}: HandAreaProps) {
  const [dragging, setDragging] = useState(false);
  const dragSet = useRef<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    setDragging(true);
    dragSet.current = new Set();
    dragStartX.current = e.clientX;
  }, [disabled]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    // 忽略微小的鼠标移动（避免误触发拖拽）
    const els = containerRef.current?.querySelectorAll('[data-hand-index]') as NodeListOf<HTMLElement>;
    if (!els || els.length === 0) return;
    for (const el of els) {
      const rect = el.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right &&
          e.clientY >= rect.top && e.clientY <= rect.bottom) {
        dragSet.current.add(Number(el.getAttribute('data-hand-index')));
      }
    }
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    if (dragSet.current.size > 0) {
      onDragSelect?.(Array.from(dragSet.current));
    }
  }, [dragging, onDragSelect]);
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

  // 锁牌组置左（组内点数降序），组间加间距，每组一个蓝色边框
  const lockedIndices = new Set(lockedGroups?.flat() || []);
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
      >
        {/* 锁牌组 — 每组一个蓝色边框包裹 */}
        {lockedGroups?.map((group, gi) => {
          const sorted = [...group].sort((a, b) => (cards[b]?.value ?? 0) - (cards[a]?.value ?? 0));
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
