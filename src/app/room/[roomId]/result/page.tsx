'use client';

import { useState } from 'react';
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
  { bg: 'bg-amber-400', text: 'text-white' },
  { bg: 'bg-neutral-300', text: 'text-neutral-700' },
  { bg: 'bg-amber-700', text: 'text-white' },
  { bg: 'bg-neutral-100', text: 'text-neutral-500' },
];

const rankLabels = ['头游', '二游', '三游', '末游'];

const levelNames: Record<number, string> = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7',
  8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A',
};

const TEAM_A_LABEL = '队A';
const TEAM_B_LABEL = '队B';

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 9H4a2 2 0 01-2-2V5a2 2 0 012-2h2M18 9h2a2 2 0 002-2V5a2 2 0 00-2-2h-2" strokeLinecap="round" />
      <path d="M6 4h12v4a6 6 0 01-12 0V4z" />
      <path d="M12 14v4M8 18h8" strokeLinecap="round" />
    </svg>
  );
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Star({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

export default function ResultPage() {
  const router = useRouter();
  const {
    phase, finalRankings, upgrade, levelRank, turnNo, hands,
    roundNumber, isFinalVictory, teamLevels,
    startNextRound, resetGame,
  } = useGameStore();

  const [showDetails, setShowDetails] = useState(false);

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

  const winningTeamIdx = finalRankings[0] % 2;
  const levelAStr = levelNames[teamLevels[0]] || String(teamLevels[0]);
  const levelBStr = levelNames[teamLevels[1]] || String(teamLevels[1]);

  const teamAWins = finalRankings.filter((s, i) => s % 2 === 0 && i < 2).length;
  const teamBWins = finalRankings.filter((s, i) => s % 2 === 1 && i < 2).length;

  const isTeamAWin = winningTeamIdx === 0;

  return (
    <main className="mx-auto max-w-lg px-4 py-8 sm:py-12">
      {/* 标题 + 胜利徽章 */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2">
          {isFinalVictory && <TrophyIcon className="h-6 w-6 text-amber-400" />}
          <h1 className="text-2xl font-bold text-neutral-900">
            {isFinalVictory ? '最终胜利' : `第 ${roundNumber} 局结束`}
          </h1>
        </div>
        {isFinalVictory && (
          <p className="mt-1 text-sm text-neutral-500">
            共 {roundNumber} 局 · 达成 A 级
          </p>
        )}
      </div>

      {/* 胜负结果横幅 */}
      <div
        className={[
          'mt-4 rounded-xl px-4 py-3 text-center text-sm font-semibold',
          isTeamAWin
            ? 'bg-accent/10 text-accent ring-1 ring-accent/20'
            : 'bg-blue-500/10 text-blue-600 ring-1 ring-blue-500/20',
        ].join(' ')}
      >
        {isTeamAWin ? TEAM_A_LABEL : TEAM_B_LABEL} 获胜
        {upgrade > 0 && ` · 升级 +${upgrade}`}
      </div>

      {/* 双方升级进度对比 (增强版) */}
      <Card padding="md" className="mt-4">
        <div className="flex items-center justify-between">
          <div className={[
            'flex flex-col items-center gap-1 transition-all duration-300',
            isTeamAWin && 'scale-105',
          ].join(' ')}>
            <span className={[
              'text-xs font-semibold',
              isTeamAWin ? 'text-accent' : 'text-neutral-400',
            ].join(' ')}>
              {TEAM_A_LABEL}
            </span>
            <span className={[
              'text-3xl font-black transition-colors',
              isTeamAWin ? 'text-accent' : 'text-neutral-400',
            ].join(' ')}>
              {levelAStr}
            </span>
            {isTeamAWin && <Star className="h-4 w-4 text-amber-400" />}
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-xs font-semibold text-neutral-400">比分</span>
            <span className="text-lg font-bold text-neutral-300">
              {teamAWins} : {teamBWins}
            </span>
          </div>

          <div className={[
            'flex flex-col items-center gap-1 transition-all duration-300',
            !isTeamAWin && 'scale-105',
          ].join(' ')}>
            <span className={[
              'text-xs font-semibold',
              !isTeamAWin ? 'text-blue-500' : 'text-neutral-400',
            ].join(' ')}>
              {TEAM_B_LABEL}
            </span>
            <span className={[
              'text-3xl font-black transition-colors',
              !isTeamAWin ? 'text-blue-500' : 'text-neutral-400',
            ].join(' ')}>
              {levelBStr}
            </span>
            {!isTeamAWin && <Star className="h-4 w-4 text-amber-400" />}
          </div>
        </div>

        {/* 进度条 (带动画) */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-7 text-xs font-medium text-neutral-400">{TEAM_A_LABEL}</span>
            <div className="relative flex h-3 flex-1 overflow-hidden rounded-full bg-neutral-100">
              <div
                className="rounded-full bg-accent transition-all duration-1000 ease-out"
                style={{
                  width: `${((teamLevels[0] - 2) / 12) * 100}%`,
                  transitionDelay: '100ms',
                }}
              />
            </div>
            <span className="w-7 text-right text-xs font-medium text-neutral-400">{levelAStr}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-7 text-xs font-medium text-neutral-400">{TEAM_B_LABEL}</span>
            <div className="relative flex h-3 flex-1 overflow-hidden rounded-full bg-neutral-100">
              <div
                className={[
                  'rounded-full transition-all duration-1000 ease-out',
                  isTeamAWin ? 'bg-neutral-300' : 'bg-blue-500',
                ].join(' ')}
                style={{
                  width: `${((teamLevels[1] - 2) / 12) * 100}%`,
                  transitionDelay: '200ms',
                }}
              />
            </div>
            <span className="w-7 text-right text-xs font-medium text-neutral-400">{levelBStr}</span>
          </div>
        </div>
      </Card>

      {/* 升级历程时间线 */}
      <Card padding="md" className="mt-4">
        <h2 className="text-sm font-semibold text-neutral-700">升级历程</h2>
        <div className="mt-3 space-y-3">
          {/* 第一局始终从 2 开始模拟 */}
          {Array.from({ length: roundNumber }).map((_, ri) => {
            const isCurrentRound = ri === roundNumber - 1;
            return (
              <div key={ri} className="flex items-center gap-3">
                {/* 时间线 */}
                <div className="flex flex-col items-center">
                  <div
                    className={[
                      'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                      isCurrentRound && isTeamAWin
                        ? 'bg-accent text-white'
                        : isCurrentRound && !isTeamAWin
                          ? 'bg-blue-500 text-white'
                          : 'bg-neutral-100 text-neutral-400',
                    ].join(' ')}
                  >
                    {ri + 1}
                  </div>
                  {ri < roundNumber - 1 && (
                    <div className="mt-0.5 w-px flex-1 bg-neutral-200" style={{ minHeight: '16px' }} />
                  )}
                </div>
                {/* 内容 */}
                <div className="flex flex-1 items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-neutral-700">
                      第{ri + 1}局
                    </span>
                    {isCurrentRound && (
                      <Badge variant="accent">当前</Badge>
                    )}
                  </div>
                  <span className="text-sm text-neutral-400">
                    {isCurrentRound ? (
                      <span className="font-semibold text-accent">
                        +{upgrade} 级
                      </span>
                    ) : (
                      <span className="text-neutral-300">已完成</span>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 排名列表 (增强版) */}
      <div className="mt-4 space-y-2">
        {finalRankings.map((seat, i) => {
          const isMe = seat === 3;
          const handRemaining = hands[seat]?.length || 0;
          const isTeamA = seat % 2 === 0;
          const teamLabel = isTeamA ? TEAM_A_LABEL : TEAM_B_LABEL;
          const isFirst = i === 0;
          const isWinnerTeam = seat % 2 === winningTeamIdx;
          const rankLabel = rankLabels[i] || `${i + 1}`;
          const remCards = hands[seat] || [];

          return (
            <Card
              key={seat}
              padding="md"
              className={[
                'flex items-center gap-3 transition-all duration-150',
                isFirst && 'ring-2 ring-amber-400/30 bg-amber-50/50 shadow-sm',
                !isFirst && 'hover:shadow-sm',
                isFinalVictory && isWinnerTeam && 'ring-amber-400/50 shadow-lg shadow-amber-400/20',
              ].join(' ')}
            >
              {/* 名次徽章 */}
              <div className={[
                  'relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-bold',
                  rankColors[i].bg,
                  rankColors[i].text,
                ].join(' ')}>
                {isFirst ? (
                  <TrophyIcon className="h-5 w-5" />
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>

              {/* 头像 + 名称 */}
              <div className="flex shrink-0 items-center gap-2">
                <Avatar name={playerNames[seat]} size="sm" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-neutral-900">
                      {playerNames[seat]}
                    </span>
                    <Badge variant={isTeamA ? 'accent' : 'default'}>{teamLabel}</Badge>
                    {isMe && <Badge variant="accent">我</Badge>}
                  </div>
                  <span className="text-[11px] text-neutral-400">{rankLabel}</span>
                </div>
              </div>

              <div className="flex-1" />

              {/* 剩余手牌 */}
              <div className="text-right">
                <span className={[
                  'text-sm font-medium',
                  handRemaining === 0 ? 'text-success' : 'text-neutral-400',
                ].join(' ')}>
                  {handRemaining > 0 ? `剩${handRemaining}张` : '出完'}
                </span>
              </div>
            </Card>
          );
        })}
      </div>

      {/* 对局统计 (增强) */}
      <Card padding="md" className="mt-4">
        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-lg font-bold text-neutral-900">{turnNo}</div>
            <div className="text-xs text-neutral-400">总回合</div>
          </div>
          <div>
            <div className="text-lg font-bold text-accent">+{upgrade}</div>
            <div className="text-xs text-neutral-400">升级</div>
          </div>
          <div>
            <div className={[
              'text-lg font-bold',
              isFinalVictory ? 'text-amber-500' : 'text-neutral-900',
            ].join(' ')}>
              {isFinalVictory ? 'A' : levelNames[levelRank] || levelRank}
            </div>
            <div className="text-xs text-neutral-400">
              {isFinalVictory ? '最终级牌' : '当前级牌'}
            </div>
          </div>
          <div>
            <div className="text-lg font-bold text-neutral-900">
              {teamAWins} - {teamBWins}
            </div>
            <div className="text-xs text-neutral-400">局分</div>
          </div>
        </div>
      </Card>

      {/* 对局详情 (可展开) */}
      <Card padding="md" className="mt-4">
        <button
          className="flex w-full items-center justify-between"
          onClick={() => setShowDetails(!showDetails)}
        >
          <span className="text-sm font-semibold text-neutral-700">对局详情</span>
          <ChevronDown className={[
            'h-4 w-4 text-neutral-400 transition-transform duration-200',
            showDetails && 'rotate-180',
          ].join(' ')} />
        </button>

        {showDetails && (
          <div className="mt-3 animate-fade-in space-y-3 border-t border-neutral-100 pt-3">
            <div className="grid grid-cols-2 gap-2">
              {finalRankings.map((seat, i) => {
                const handCount = hands[seat]?.length || 0;
                const isTeamA = seat % 2 === 0;
                return (
                  <div key={seat} className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-neutral-400">#{i + 1}</span>
                      <span className="text-sm text-neutral-700">{playerNames[seat]}</span>
                      <Badge variant={isTeamA ? 'accent' : 'default'}>{isTeamA ? TEAM_A_LABEL : TEAM_B_LABEL}</Badge>
                    </div>
                    <span className="text-xs text-neutral-400">
                      剩{handCount}张
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
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
