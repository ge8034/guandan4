'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { useGameStore } from '@/lib/store/game';

const playerNames = ['牌神', '掼蛋高手', '扑克达人', '我'];
const rankColors = [
  'bg-accent text-white',
  'bg-neutral-300 text-neutral-700',
  'bg-neutral-100 text-neutral-500',
  'bg-neutral-100 text-neutral-400',
];
const levelNames: Record<number, string> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7',
  8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A',
};

const TEAM_A_LABEL = '队A';
const TEAM_B_LABEL = '队B';

export default function ResultPage() {
  const router = useRouter();
  const {
    phase, finalRankings, upgrade, levelRank, turnNo, hands,
    roundNumber, isFinalVictory, teamLevels,
    startNextRound, resetGame,
  } = useGameStore();

  // 无结果数据时显示空状态
  if (phase !== 'finished' || finalRankings.length < 4) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-sm text-neutral-400">暂无对局数据</p>
          <Link href="/lobby">
            <Button variant="outline" size="sm" className="mt-4">
              返回大厅
            </Button>
          </Link>
        </div>
      </main>
    );
  }

  const handleNextRound = () => {
    startNextRound();
    const currentRoomId = window.location.pathname.split('/')[2];
    router.push(`/room/${currentRoomId}`);
  };

  const handleNewGame = () => {
    resetGame();
    const currentRoomId = window.location.pathname.split('/')[2];
    router.push(`/room/${currentRoomId}`);
  };

  // 0 = 队A(座位0,2), 1 = 队B(座位1,3)
  const winningTeamIdx = finalRankings[0] % 2;
  const levelAStr = levelNames[teamLevels[0]] || String(teamLevels[0]);
  const levelBStr = levelNames[teamLevels[1]] || String(teamLevels[1]);

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      {/* 标题 */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-neutral-900">
          {isFinalVictory ? '最终胜利！' : '第 ' + roundNumber + ' 局结束'}
        </h1>
        {isFinalVictory && (
          <p className="mt-2 text-sm text-neutral-500">
            共 {roundNumber} 局
          </p>
        )}
      </div>

      {/* 双方升级进度对比 */}
      <Card padding="md" className="mt-6">
        <div className="flex items-center justify-between">
          {/* 队A */}
          <div
            className={[
              'flex flex-col items-center gap-1',
              winningTeamIdx === 0 ? 'text-accent' : 'text-neutral-400',
            ].join(' ')}
          >
            <span className="text-xs font-medium">{TEAM_A_LABEL}</span>
            <span className="text-2xl font-bold">{levelAStr}</span>
          </div>

          {/* 分隔 */}
          <span className="text-sm font-semibold text-neutral-300">VS</span>

          {/* 队B */}
          <div
            className={[
              'flex flex-col items-center gap-1',
              winningTeamIdx === 1 ? 'text-blue-500' : 'text-neutral-400',
            ].join(' ')}
          >
            <span className="text-xs font-medium">{TEAM_B_LABEL}</span>
            <span className="text-2xl font-bold">{levelBStr}</span>
          </div>
        </div>

        {/* 进度条 */}
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-6 text-xs text-neutral-400">{TEAM_A_LABEL}</span>
            <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
              <div
                className="rounded-full bg-accent transition-all duration-500"
                style={{ width: `${((teamLevels[0] - 2) / 12) * 100}%` }}
              />
            </div>
            <span className="w-6 text-right text-xs text-neutral-400">{levelAStr}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 text-xs text-neutral-400">{TEAM_B_LABEL}</span>
            <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
              <div
                className={[
                  'rounded-full transition-all duration-500',
                  winningTeamIdx === 1 ? 'bg-blue-500' : 'bg-neutral-300',
                ].join(' ')}
                style={{ width: `${((teamLevels[1] - 2) / 12) * 100}%` }}
              />
            </div>
            <span className="w-6 text-right text-xs text-neutral-400">{levelBStr}</span>
          </div>
        </div>
      </Card>

      {/* 排名列表 */}
      <div className="mt-6 space-y-3">
        {finalRankings.map((seat, i) => {
          const isMe = seat === 3;
          const handRemaining = hands[seat]?.length || 0;
          const isTeamA = seat % 2 === 0;
          const teamLabel = isTeamA ? TEAM_A_LABEL : TEAM_B_LABEL;
          const isFirst = i === 0;
          const isWinnerTeam = seat % 2 === winningTeamIdx;

          return (
            <Card
              key={seat}
              padding="md"
              className={[
                'flex items-center gap-4 transition-all duration-150',
                // 头游金色微光
                isFirst && 'ring-2 ring-amber-400/30 bg-amber-50/50 shadow-sm',
                // 非头游默认悬停
                !isFirst && 'hover:shadow-sm',
                // 最终胜利：获胜方金色边框+发光
                isFinalVictory && isWinnerTeam && 'ring-amber-400/50 shadow-lg shadow-amber-400/20',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {/* 名次 */}
              <span
                className={[
                  'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold',
                  rankColors[i] || rankColors[3],
                  isFirst && 'overflow-hidden',
                ].join(' ')}
              >
                {i + 1}
                {isFirst && (
                  <span className="absolute inset-0 animate-pulse rounded-full bg-white/20" />
                )}
              </span>

              {/* 头像 */}
              <Avatar name={playerNames[seat]} size="sm" />

              {/* 名称 + 标记 */}
              <span className="flex-1 font-medium text-neutral-900">
                <span className="flex items-center gap-2">
                  {playerNames[seat]}
                  <Badge variant={isTeamA ? 'accent' : 'default'}>{teamLabel}</Badge>
                  {isMe && <Badge variant="accent">我</Badge>}
                </span>
              </span>

              {/* 剩余手牌 */}
              <span className="text-sm text-neutral-400">
                {handRemaining > 0 ? `剩${handRemaining}张` : '已出完'}
              </span>
            </Card>
          );
        })}
      </div>

      {/* 对局统计 */}
      <Card padding="md" className="mt-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-neutral-900">{turnNo}</div>
            <div className="text-xs text-neutral-400">总回合</div>
          </div>
          <div>
            <div className="text-lg font-bold text-accent">+{upgrade}</div>
            <div className="text-xs text-neutral-400">升级</div>
          </div>
          <div>
            <div className="text-lg font-bold text-neutral-900">
              {isFinalVictory ? '胜' : levelNames[levelRank] || levelRank}
            </div>
            <div className="text-xs text-neutral-400">
              {isFinalVictory ? '最终级牌' : '当前级牌'}
            </div>
          </div>
        </div>
      </Card>

      {/* 操作按钮 */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        {isFinalVictory ? (
          <Button
            variant="primary"
            size="lg"
            className="w-full sm:w-auto"
            onClick={handleNewGame}
          >
            新游戏
          </Button>
        ) : (
          <Button
            variant="primary"
            size="lg"
            className="w-full sm:w-auto"
            onClick={handleNextRound}
          >
            下一局（级牌 {levelNames[levelRank] || levelRank}）
          </Button>
        )}
        <Link href="/lobby">
          <Button variant="outline" size="lg" className="w-full sm:w-auto">
            返回大厅
          </Button>
        </Link>
      </div>
    </main>
  );
}
