import type { Metadata } from 'next';
import { Fredoka, Nunito } from 'next/font/google';
import './globals.css';
import { Navigation } from '@/components/layout/Navigation';
import { Footer } from '@/components/layout/Footer';

const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-fredoka',
});

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-nunito',
});

export const metadata: Metadata = {
  title: 'GuanDan4',
  description: '经典掼蛋在线卡牌游戏',
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
    <html lang="zh-CN" className={`${fredoka.variable} ${nunito.variable}`}>
      <body className="min-h-screen bg-neutral-50 text-neutral-900 antialiased">
        <Navigation />
        <div className="min-h-[calc(100vh-3.5rem)]">{children}</div>
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
