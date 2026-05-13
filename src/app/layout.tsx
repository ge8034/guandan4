import type { Metadata } from 'next';
import './globals.css';
import { Navigation } from '@/components/layout/Navigation';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'GuanDan4',
  description: '经典掼蛋在线卡牌游戏',
  icons: { icon: '/icons/icon-192.svg' },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: '掼蛋',
    statusBarStyle: 'black-translucent',
  },
  other: {
    'theme-color': '#4f46e5',
    'mobile-web-app-capable': 'yes',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen flex flex-col bg-neutral-50 text-neutral-900 antialiased">
        <Navigation />
        <div className="flex-1">{children}</div>
        <Footer />
        <script
          dangerouslySetInnerHTML={{
            __html: [
              'if (\'serviceWorker\' in navigator) {',
              '  window.addEventListener(\'load\', () => {',
              '    navigator.serviceWorker.register(\'/sw.js\');',
              '  });',
              '}',
            ].join('\n'),
          }}
        />
      </body>
    </html>
  );
}
