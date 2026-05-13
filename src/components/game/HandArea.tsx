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
  onPlayDoubleClick?: () => void;
  lockedGroups?: CardData[][];
  onDragSelect?: (indices: number[]) => void;
  onDeselectAll?: () => void;
  levelRank?: number;
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
  onPlayDoubleClick,
  lockedGroups,
  onDragSelect,
  onDeselectAll,
  levelRank,
}: HandAreaProps) {
  const draggingRef = useRef(false);
  const dragSet = useRef<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const lastClickRef = useRef<{ index: number; time: number } | null>(null);

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

  // 双击出牌：同一张已选中牌在 300ms 内被点击两次，触发 onPlayDoubleClick
  const handleCardClickWrapper = (origIndex: number) => {
    const now = Date.now();
    const last = lastClickRef.current;
    if (
      onPlayDoubleClick &&
      last &&
      last.index === origIndex &&
      now - last.time < 300 &&
      selectedCardIds?.has(origIndex)
    ) {
      onPlayDoubleClick();
      lastClickRef.current = null;
      return;
    }
    lastClickRef.current = { index: origIndex, time: now };
    onCardClick?.(origIndex);
  };

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
  // 未锁定牌：按牌值降序排序，相同点数自然聚在一起（对子/三张/炸弹一目了然）
  // 大小王(value>=100)排在最后
  const unlockedIndices = cards
    .map((_, i) => i)
    .filter(i => !lockedIndices.has(i))
    .sort((a, b) => {
      const va = cards[a]?.value ?? 0;
      const vb = cards[b]?.value ?? 0;
      const isJokerA = va >= 100;
      const isJokerB = vb >= 100;
      if (isJokerA !== isJokerB) return isJokerA ? 1 : -1;
      return vb - va;
    });

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
              className="flex items-end -translate-y-1.5"
            style={gi > 0 ? { marginLeft: 'calc(var(--card-overlap) * 0.5)' } : undefined}
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
                        levelRank={levelRank}
                        onClick={() => handleCardClickWrapper(origIndex)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* 未锁定牌 — 按牌值分组排序 */}
        {unlockedIndices.map((origIndex, idx) => {
          const card = cards[origIndex];
          if (!card) return null;
          const isPlaying = playingIndices?.has(origIndex);
          const seq = nextSeq();

          // 检测新牌值分组起点，添加视觉间隔
          const isNewGroup = idx > 0 && cards[unlockedIndices[idx - 1]]?.value !== card.value;

          return (
            <div
              key={`${card.suit}-${card.rank}-${origIndex}`}
              data-hand-index={origIndex}
              className={[
                'transition-all duration-200 ease-out',
                isNewGroup && 'mx-1',
                isPlaying && 'animate-fly-away will-change-transform',
              ].filter(Boolean).join(' ')}
              style={{
                marginLeft: idx > 0 ? 'var(--card-overlap)' : '0',
                zIndex: seq,
              }}
            >
              <PlayingCard
                card={card}
                selected={selectedCardIds?.has(origIndex)}
                disabled={disabled || isPlaying}
                levelRank={levelRank}
                onClick={() => handleCardClickWrapper(origIndex)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
