'use client';

export interface CardData {
  suit: 'heart' | 'diamond' | 'club' | 'spade' | 'joker';
  rank: string;
  value: number;
}

interface PlayingCardProps {
  card: CardData;
  selected?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  levelRank?: number;
}

const suitSymbols: Record<string, string> = {
  heart: '♥',
  diamond: '♦',
  club: '♣',
  spade: '♠',
  joker: '★',
};

const suitNames: Record<string, string> = {
  heart: '红桃',
  diamond: '方块',
  club: '梅花',
  spade: '黑桃',
  joker: '',
};

const suitColors: Record<string, string> = {
  heart: 'text-red-600',
  diamond: 'text-red-600',
  club: 'text-neutral-900',
  spade: 'text-neutral-900',
  joker: 'text-red-600',
};

const sizeDimensions: Record<string, string> = {
  sm: 'w-8 h-12',
  md: 'w-11 h-16',
  lg: 'w-14 h-20',
};

const sizeCorner: Record<string, string> = {
  sm: 'text-[7px]',
  md: 'text-[10px]',
  lg: 'text-xs',
};

const sizeCenter: Record<string, string> = {
  sm: 'text-[9px]',
  md: 'text-lg',
  lg: 'text-xl',
};

/** 生成无障碍标签 */
function getAriaLabel(card: CardData): string {
  if (card.suit === 'joker') {
    return card.value > 100 ? '大王' : '小王';
  }
  const suitName = suitNames[card.suit];
  return `${suitName}${card.rank}`;
}

/** 角标：点数在上、花色在下 */
function CardCorner({ rank, symbol, colorClass }: { rank: string; symbol: string; colorClass: string }) {
  return (
    <span className={['flex flex-col items-center leading-none', colorClass].join(' ')}>
      <span className="font-bold">{rank}</span>
      <span className="-mt-0.5">{symbol}</span>
    </span>
  );
}

export function PlayingCard({
  card,
  selected = false,
  disabled = false,
  size = 'md',
  onClick,
  levelRank,
}: PlayingCardProps) {
  const colorClass = suitColors[card.suit];
  const symbol = suitSymbols[card.suit];
  const isJoker = card.suit === 'joker';
  const isLevelCard = !isJoker && levelRank !== undefined && card.value === levelRank;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={getAriaLabel(card)}
      aria-pressed={selected}
      style={isLevelCard ? { backgroundColor: '#d1d5db' } : undefined}
      className={[
        'relative flex shrink-0 select-none flex-col items-center justify-center',
        'rounded-md border-2 font-card',
        'bg-card-bg',
        'transition-all duration-150 ease-out',
        sizeDimensions[size],
        selected
          ? 'border-accent -translate-y-1.5 scale-[1.02] shadow-lg shadow-accent/20 z-50'
          : 'border-card-border shadow-sm hover:shadow-md hover:-translate-y-0.5',
        !disabled && 'cursor-pointer active:scale-95',
        disabled && 'cursor-not-allowed opacity-75',
      ].join(' ')}
    >
      {isJoker ? (
        /* Joker 牌面：中央显示文字 */
        <>
          <span className={['absolute left-0.5 top-0.5', sizeCorner[size], colorClass].join(' ')}>
            <span className="font-bold">{card.value > 100 ? '大' : '小'}</span>
          </span>
          <span className={['font-bold tracking-wider', colorClass, size === 'sm' ? 'text-[8px]' : 'text-xs'].join(' ')}>
            {card.value > 100 ? 'JOKER' : 'JOKER'}
          </span>
          <span className={['absolute right-0.5 bottom-0.5 rotate-180', sizeCorner[size], colorClass].join(' ')}>
            <span className="font-bold">{card.value > 100 ? '大' : '小'}</span>
          </span>
        </>
      ) : (
        <>
          {/* 左上角 */}
          <span className={['absolute left-0.5 top-0.5', sizeCorner[size]].join(' ')}>
            <CardCorner rank={card.rank} symbol={symbol} colorClass={colorClass} />
          </span>

          {/* 中央花色 */}
          <span className={[sizeCenter[size], colorClass].join(' ')}>
            {symbol}
          </span>

          {/* 右下角 — 旋转180度 */}
          <span className={['absolute right-0.5 bottom-0.5 rotate-180', sizeCorner[size]].join(' ')}>
            <CardCorner rank={card.rank} symbol={symbol} colorClass={colorClass} />
          </span>
        </>
      )}
    </button>
  );
}
