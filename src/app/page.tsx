'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const features = [
  {
    title: '经典掼蛋规则',
    description: '完整的掼蛋牌型体系，炸弹、火箭、进贡还贡、升级规则一应俱全。',
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 7V4h16v3M9 21h6M8 17l1-7h6l1 7M11 11h2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 4l3 7M17 4l-3 7" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: '实时多人对战',
    description: '支持4人实时在线对战，稳定的联网游戏体验。',
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="6" r="3" />
        <path d="M5 20v-2a4 4 0 014-4h6a4 4 0 014 4v2" strokeLinecap="round" />
        <circle cx="7" cy="14" r="1.5" fill="currentColor" />
        <circle cx="17" cy="14" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    title: '智能 AI 陪练',
    description: '三种难度级别，从新手到高手的渐进式AI训练。1v3 练习模式随时开打。',
    icon: (
      <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="7" width="18" height="12" rx="2" />
        <path d="M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2" strokeLinecap="round" />
        <circle cx="10" cy="13" r="0.5" fill="currentColor" />
        <circle cx="14" cy="13" r="0.5" fill="currentColor" />
        <path d="M9 16h6" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* 装饰背景 */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-accent/5 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-cta/5 blur-3xl" />
        </div>

        <div className="mx-auto max-w-5xl flex flex-col items-center px-4 pt-24 pb-16 text-center">
          <div className={[
            'transition-all duration-500 ease-out',
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
          ].join(' ')}>
            <h1 className="text-5xl font-bold tracking-tight text-neutral-900 sm:text-6xl">
              <span className="text-accent">掼蛋</span>在线
            </h1>
            <p className="mt-5 max-w-md text-base text-neutral-500 leading-relaxed">
              经典四人两副牌扑克游戏。与好友对战，或与AI练习。
            </p>
          </div>

          <div className={[
            'mt-10 flex flex-wrap items-center justify-center gap-4',
            'transition-all duration-500 delay-100 ease-out',
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
          ].join(' ')}>
            <Link href="/lobby">
              <Button variant="primary" size="lg">
                开始练习
              </Button>
            </Link>
            <Link href="/lobby">
              <Button variant="secondary" size="lg">
                进入大厅
              </Button>
            </Link>
            <Link href="/rules">
              <Button variant="outline" size="lg">
                游戏规则
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 特色卡片 */}
      <section className="mx-auto max-w-5xl px-4 pb-24">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {features.map((feat, i) => (
            <div
              key={feat.title}
              className={[
                'transition-all duration-500 ease-out',
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
              ].join(' ')}
              style={{ transitionDelay: `${200 + i * 100}ms` }}
            >
              <Card variant="hoverable" padding="lg">
                <div className={[
                  'mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl',
                  'bg-accent/10 text-accent',
                ].join(' ')}>
                  {feat.icon}
                </div>
                <h3 className="text-lg font-semibold text-neutral-900">
                  {feat.title}
                </h3>
                <p className="mt-2 text-sm text-neutral-500 leading-relaxed">
                  {feat.description}
                </p>
              </Card>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
