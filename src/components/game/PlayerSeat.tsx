import { Avatar } from '../ui/Avatar';

interface PlayerSeatProps {
  name: string;
  cardCount: number;
  isOnline: boolean;
  isCurrentTurn: boolean;
  isMe: boolean;
}

export function PlayerSeat({
  name,
  cardCount,
  isOnline,
  isCurrentTurn,
  isMe,
}: PlayerSeatProps) {
  return (
    <div
      className={[
        'flex flex-col items-center gap-1 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5',
        'transition-all duration-200 ease-out',
        isCurrentTurn
          ? 'bg-white/15 ring-2 ring-accent/40 shadow-sm shadow-accent/10'
          : 'bg-white/5',
      ].join(' ')}
    >
      <Avatar name={name} size="md" online={isOnline} />
      <span className="text-xs font-medium text-white/80 truncate max-w-[5rem] sm:max-w-[6rem]">
        {name}
      </span>
      <span className="text-xs text-white/40">
        {cardCount} 张
      </span>
      {isCurrentTurn && (
        <span className="flex items-center gap-1 text-xs text-accent-light font-medium">
          <span className="breathe-dot" />
          出牌中
        </span>
      )}
    </div>
  );
}
