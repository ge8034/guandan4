import { Badge } from '../ui/Badge';

interface GameStatusBarProps {
  status: 'waiting' | 'playing' | 'finished';
  levelRank: number;
  turnNo: number;
  roundCount: number;
  roomName: string;
  hasTribute?: boolean;
  resistCount?: number;
}

const statusLabels: Record<string, string> = {
  waiting: '等待中',
  playing: '游戏中',
  finished: '已结束',
};

const statusVariants: Record<string, 'default' | 'success' | 'warning' | 'error' | 'accent'> = {
  waiting: 'warning',
  playing: 'success',
  finished: 'default',
};

const levelRanks: Record<number, string> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7',
  8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K', 1: 'A',
};

export function GameStatusBar({
  status,
  levelRank,
  turnNo,
  roundCount,
  roomName,
  hasTribute,
  resistCount = 0,
}: GameStatusBarProps) {
  return (
    <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 glass-dark text-white rounded-lg">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <span className="text-xs sm:text-sm font-medium truncate max-w-[6rem] sm:max-w-[10rem]">
          {roomName}
        </span>
        <Badge variant={statusVariants[status]}>{statusLabels[status]}</Badge>
        {hasTribute && (
          <Badge variant="accent">
            {resistCount > 0 ? `抗贡×${resistCount}` : '已进贡'}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2 sm:gap-4 text-xs text-white/50 shrink-0">
        <span>
          级牌{' '}
          <span className="text-accent-light font-semibold">
            {levelRanks[levelRank] || levelRank}
          </span>
        </span>
        <span className="hidden sm:inline">
          第{' '}
          <span className="text-white font-medium">{roundCount}</span>{' '}
          局
        </span>
        <span>
          第{' '}
          <span className="text-white font-medium">{turnNo}</span>{' '}
          轮
        </span>
      </div>
    </div>
  );
}
