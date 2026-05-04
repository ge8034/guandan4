import { Card } from '@/components/ui/Card';
import { ruleSections } from '@/mock/data';

const cardTypes = [
  { name: '单张', count: '1张', example: '任意一张牌' },
  { name: '对子', count: '2张', example: '两张相同点数的牌' },
  { name: '三同张', count: '3张', example: '三张相同点数的牌' },
  { name: '三带二', count: '5张', example: '三同张 + 一个对子' },
  { name: '顺子', count: '5张', example: '五张连续同花色的牌（不含王）' },
  { name: '连对', count: '6张', example: '三组连续的对子' },
  { name: '钢板', count: '6张', example: '两组连续的三同张' },
  { name: '炸弹', count: '4-8张', example: '四张及以上相同点数的牌' },
  { name: '火箭/王炸', count: '4张', example: '四张王牌（两大王+两小王）' },
];

export default function RulesPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-neutral-900">游戏规则</h1>
      <p className="mt-0.5 text-sm text-neutral-500">掼蛋完整规则说明</p>

      {/* 规则章节 */}
      <div className="mt-8 space-y-6">
        {ruleSections.map((section) => (
          <Card key={section.title} padding="lg">
            <h2 className="text-lg font-semibold text-neutral-900">{section.title}</h2>
            <p className="mt-2 text-sm text-neutral-600 leading-relaxed whitespace-pre-line">
              {section.content}
            </p>
          </Card>
        ))}
      </div>

      {/* 牌型一览 */}
      <Card padding="lg" className="mt-6">
        <h2 className="text-lg font-semibold text-neutral-900">牌型一览</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs text-neutral-400">
                <th className="pb-2 font-medium">牌型</th>
                <th className="pb-2 font-medium">张数</th>
                <th className="pb-2 font-medium">说明</th>
              </tr>
            </thead>
            <tbody>
              {cardTypes.map((ct) => (
                <tr key={ct.name} className="border-b border-neutral-100">
                  <td className="py-2.5 font-medium text-neutral-900">{ct.name}</td>
                  <td className="py-2.5 text-neutral-500">{ct.count}</td>
                  <td className="py-2.5 text-neutral-500">{ct.example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
}
