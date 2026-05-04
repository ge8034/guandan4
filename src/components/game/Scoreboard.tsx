import { useGameStore } from '@/lib/store/game';

const LEVEL_STEPS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
const LEVEL_LABELS: Record<number, string> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7',
  8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A',
};

export function Scoreboard() {
  const { teamLevels } = useGameStore();

  return (
    <div className="flex items-center justify-between gap-2 sm:gap-4">
      {/* 队A (座位 0, 2) */}
      <TeamProgress
        label="上/下"
        side="left"
        current={teamLevels[0]}
      />
      {/* 队B (座位 1, 3) */}
      <TeamProgress
        label="对/我"
        side="right"
        current={teamLevels[1]}
      />
    </div>
  );
}

function TeamProgress({
  label,
  side,
  current,
}: {
  label: string;
  side: 'left' | 'right';
  current: number;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] sm:text-xs text-white/40">{label}</span>
      <div className="flex flex-col gap-0.5">
        {LEVEL_STEPS.map((step) => {
          const reached = current >= step;
          const isCurrent = current === step;
          return (
            <div
              key={step}
              className={[
                'flex items-center gap-1',
                side === 'right' && 'flex-row-reverse',
              ].join(' ')}
            >
              <span
                className={[
                  'h-1.5 w-1.5 rounded-full transition-colors duration-300',
                  reached
                    ? isCurrent
                      ? 'bg-accent-light shadow-sm shadow-accent/50'
                      : 'bg-white/30'
                    : 'bg-white/10',
                ].join(' ')}
              />
              <span
                className={[
                  'text-[9px] sm:text-[10px] leading-none',
                  reached ? 'text-white/60' : 'text-white/20',
                  isCurrent && 'text-accent-light font-medium',
                ].join(' ')}
              >
                {LEVEL_LABELS[step]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
