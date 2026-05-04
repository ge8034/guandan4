import { Card } from '@/components/ui/Card';

const faqs = [
  {
    q: '什么是掼蛋？',
    a: '掼蛋是一种起源于中国的四人两副牌扑克牌游戏。玩家两两组队，通过出牌竞争，最先出完手牌的一方获胜。',
  },
  {
    q: '如何开始一局游戏？',
    a: '在大厅中选择已有的房间加入，或创建自己的房间。当房间满4人后即可开始游戏。也可以选择练习模式与AI对战。',
  },
  {
    q: '什么是"逢人配"？',
    a: '当前级牌的红桃牌即为"逢人配"（万能牌），可以替代任意一张牌来组成牌型。例如级牌为2时，红桃2就是逢人配。',
  },
  {
    q: '是否需要注册账号？',
    a: '不需要。GuanDan4 使用匿名会话，进入即可开始游戏。',
  },
  {
    q: '支持哪些设备？',
    a: '支持所有主流浏览器，包括桌面端（Chrome、Firefox、Edge、Safari）和移动端（iOS Safari、Chrome Android、微信内置浏览器）。',
  },
  {
    q: '如何反馈问题？',
    a: '请访问项目 GitHub 仓库提交 Issue，或通过帮助页面的反馈入口联系我们。',
  },
];

export default function HelpPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold text-neutral-900">帮助</h1>
      <p className="mt-0.5 text-sm text-neutral-500">常见问题与支持</p>

      <div className="mt-8 space-y-3">
        {faqs.map((faq) => (
          <Card key={faq.q} variant="hoverable" padding="lg">
            <h3 className="font-semibold text-sm text-neutral-900">{faq.q}</h3>
            <p className="mt-1.5 text-sm text-neutral-500 leading-relaxed">{faq.a}</p>
          </Card>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-center">
        <p className="text-sm text-neutral-600">还有其他问题？</p>
        <p className="mt-1 text-xs text-neutral-400">
          请发送邮件至 feedback@guandan4.example.com
        </p>
      </div>
    </main>
  );
}
