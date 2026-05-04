import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Tabs } from '@/components/ui/Tabs';
import { mockLeaderboard } from '@/mock/data';

export default function LeaderboardPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-neutral-900">排行榜</h1>
      <p className="mt-0.5 text-sm text-neutral-500">掼蛋玩家积分排名</p>

      <div className="mt-6">
        <Tabs
          tabs={[
            {
              key: 'total',
              label: '总榜',
              content: <LeaderboardTable data={mockLeaderboard} />,
            },
            {
              key: 'week',
              label: '周榜',
              content: <LeaderboardTable data={mockLeaderboard.slice(0, 3)} />,
            },
            {
              key: 'month',
              label: '月榜',
              content: <LeaderboardTable data={mockLeaderboard.slice(0, 4)} />,
            },
          ]}
        />
      </div>
    </main>
  );
}

function LeaderboardTable({
  data,
}: {
  data: typeof mockLeaderboard;
}) {
  return (
    <div className="space-y-2">
      {data.map((player) => (
        <div
          key={player.rank}
          className={[
            'flex items-center gap-4 rounded-lg border border-neutral-200 bg-white p-3 transition-all duration-150 ease-out',
            'hover:shadow-sm hover:border-neutral-300',
            player.rank === 1 && 'ring-2 ring-accent/30 bg-accent/5',
          ].join(' ')}
        >
          <span className={[
            'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
            player.rank === 1 && 'bg-accent text-white',
            player.rank === 2 && 'bg-neutral-300 text-neutral-700',
            player.rank === 3 && 'bg-amber-200 text-amber-700',
            player.rank > 3 && 'bg-neutral-100 text-neutral-500',
          ].join(' ')}>
            {player.rank}
          </span>
          <Avatar name={player.name} size="sm" />
          <span className="flex-1 font-medium text-sm text-neutral-900">{player.name}</span>
          <span className="text-sm text-neutral-500">{player.score} 分</span>
          <span className="text-xs text-neutral-400">胜率 {player.winRate}</span>
        </div>
      ))}
    </div>
  );
}
