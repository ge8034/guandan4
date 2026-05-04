import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';

const stats = [
  { label: '总局数', value: '245' },
  { label: '胜率', value: '62%' },
  { label: '最高连胜', value: '12' },
  { label: '段位', value: '大师' },
];

const recentGames = [
  { room: '高手对决', date: '2026-04-28', result: '胜', rank: 1, score: 85 },
  { room: '练习房', date: '2026-04-27', result: '胜', rank: 1, score: 72 },
  { room: '牌王挑战', date: '2026-04-26', result: '负', rank: 3, score: 45 },
];

export default function ProfilePage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      {/* 用户信息 */}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
        <Avatar name="我" size="lg" />
        <div className="flex-1 text-center sm:text-left">
          <div className="flex items-center justify-center gap-2 sm:justify-start">
            <h1 className="text-xl font-bold text-neutral-900">我</h1>
            <Badge variant="accent">大师</Badge>
          </div>
          <p className="mt-1 text-sm text-neutral-500">ID: user_anonymous_12345</p>
        </div>
        <Button variant="outline" size="sm">编辑资料</Button>
      </div>

      {/* 战绩概览 */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} padding="sm">
            <div className="text-center">
              <div className="text-lg font-bold text-neutral-900">{s.value}</div>
              <div className="text-xs text-neutral-400">{s.label}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* 标签页 */}
      <div className="mt-8">
        <Tabs
          tabs={[
            {
              key: 'recent',
              label: '最近对局',
              content: (
                <div className="space-y-2">
                  {recentGames.map((g, i) => (
                    <Card key={i} variant="hoverable" padding="md" className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm text-neutral-900">{g.room}</div>
                        <div className="text-xs text-neutral-400">{g.date}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-neutral-500">第{g.rank}名</span>
                        <span className="text-sm text-neutral-500">{g.score}分</span>
                        <Badge variant={g.result === '胜' ? 'success' : 'error'}>{g.result}</Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              ),
            },
            {
              key: 'stats',
              label: '详细统计',
              content: (
                <p className="py-12 text-center text-sm text-neutral-400">
                  详细统计数据将在阶段 2+ 提供
                </p>
              ),
            },
          ]}
        />
      </div>
    </main>
  );
}
