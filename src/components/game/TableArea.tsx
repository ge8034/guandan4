import { PlayingCard, type CardData } from './PlayingCard';

interface TableAreaProps {
  recentTurns: {
    turnNo: number;
    seatNo: number;
    type: 'play' | 'pass';
    cards?: CardData[];
  }[];
  currentTurnSeat: number;
}

const seatLabels = ['上家', '对家', '下家', '你'];

export function TableArea({ recentTurns, currentTurnSeat }: TableAreaProps) {
  const latestTurn = recentTurns[0];
  const currentTurnNo = latestTurn?.turnNo || 0;

  return (
    <div className="flex items-center justify-center p-3 sm:p-6">
      <div className="flex flex-col items-center gap-3 sm:gap-5">
        {/* 对家出牌 */}
        <TableTurn
          label="对家"
          turn={recentTurns.find((t) => t.seatNo === 1)}
          isCurrent={currentTurnSeat === 1}
        />

        {/* 中间行：左 + 中 + 右 */}
        <div className="flex items-center gap-4 sm:gap-8">
          {/* 上家出牌 */}
          <TableTurn
            label="上家"
            turn={recentTurns.find((t) => t.seatNo === 0)}
            isCurrent={currentTurnSeat === 0}
          />

          {/* 中央：当前回合指示 — 玻璃态 */}
          <div className="flex flex-col items-center gap-1 rounded-xl glass-dark px-5 sm:px-8 py-2.5 sm:py-3 text-white min-w-[6rem] sm:min-w-[8rem]">
            <span className="text-xs text-white/50">第 {currentTurnNo} 轮</span>
            <div className="flex items-center gap-1.5">
              {currentTurnSeat >= 0 && (
                <span className="breathe-dot" />
              )}
              <span className="text-sm sm:text-base font-semibold text-white">
                {seatLabels[currentTurnSeat] || '--'} 出牌
              </span>
            </div>
          </div>

          {/* 下家出牌 */}
          <TableTurn
            label="下家"
            turn={recentTurns.find((t) => t.seatNo === 2)}
            isCurrent={currentTurnSeat === 2}
          />
        </div>

        {/* 你的出牌 */}
        <TableTurn
          label="你"
          turn={recentTurns.find((t) => t.seatNo === 3)}
          isCurrent={currentTurnSeat === 3}
        />
      </div>
    </div>
  );
}

/** 单个玩家的出牌展示 */
function TableTurn({
  label,
  turn,
  isCurrent,
}: {
  label: string;
  turn: { type: 'play' | 'pass'; cards?: CardData[] } | undefined;
  isCurrent: boolean;
}) {
  return (
    <div
      className={[
        'flex flex-col items-center gap-1 rounded-lg p-2 sm:p-3 min-w-[5rem] sm:min-w-[7rem]',
        'transition-all duration-200 ease-out',
        isCurrent
          ? 'bg-white/10 ring-2 ring-accent/40'
          : 'bg-white/5',
      ].join(' ')}
    >
      <span className="text-xs text-white/40">{label}</span>
      {turn ? (
        turn.type === 'pass' ? (
          <span className="text-sm font-medium text-white/50">过</span>
        ) : (
          <div className="flex gap-1 animate-fade-in-scale">
            {turn.cards?.map((card, i) => (
              <PlayingCard key={i} card={card} size="sm" />
            ))}
          </div>
        )
      ) : (
        <span className="text-xs text-white/20">--</span>
      )}
    </div>
  );
}
