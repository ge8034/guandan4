import { useGameStore } from '@/lib/store/game';

const LEVEL_STEPS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
const LEVEL_LABELS: Record<number, string> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7',
  8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A',
};

export function Scoreboard() {
  const { teamLevels, levelRank, turnNo, roundNumber } = useGameStore();
  const rankLabel = LEVEL_LABELS[levelRank] || String(levelRank);

  return (
    <div className="flex items-center justify-between gap-3 sm:gap-4">
      <div className="flex items-center gap-3 sm:gap-4">
        <TeamProgress label="上/下" current={teamLevels[0]} />
        <TeamProgress label="对/我" current={teamLevels[1]} />
      </div>
      {/* 桌面端元数据 */}
      <div className="hidden sm:flex items-center gap-3 text-xs text-white/40 shrink-0">
        <span>
          级牌 <span className="text-accent-light font-semibold">{rankLabel}</span>
        </span>
        <span>
          第 <span className="text-white font-medium">{roundNumber}</span> 局
        </span>
        <span>
          第 <span className="text-white font-medium">{turnNo}</span> 轮
        </span>
      </div>
    </div>
  );
}

function TeamProgress({ label, current }: { label: string; current: number }) {
  const currentLabel = LEVEL_LABELS[current] || String(current);
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] sm:text-xs text-white/40 whitespace-nowrap">{label}</span>
      <div className="flex items-center gap-0.5">
        {LEVEL_STEPS.map((step) => (
          <span
            key={step}
            className={[
              'h-1.5 w-1.5 rounded-full transition-colors duration-300',
              current >= step
                ? current === step ? 'bg-accent-light shadow-sm shadow-accent/50' : 'bg-white/30'
                : 'bg-white/10',
            ].join(' ')}
          />
        ))}
      </div>
      <span className="text-xs sm:text-sm text-accent-light font-bold ml-1">{currentLabel}</span>
    </div>
  );
}
