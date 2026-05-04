'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { Avatar } from '../ui/Avatar';

const mainLinks = [
  { href: '/lobby', label: '大厅' },
  { href: '/leaderboard', label: '排行榜' },
  { href: '/rules', label: '规则' },
  { href: '/help', label: '帮助' },
];

const userMenuLinks = [
  { href: '/profile', label: '个人资料' },
  { href: '/friends', label: '好友' },
];

export function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav className="sticky top-0 z-[--z-sticky] border-b border-neutral-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-14 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-semibold text-lg text-neutral-900 hover:text-accent-dark transition-colors duration-150">
            <span className="text-accent text-xl font-bold">G4</span>
            <span className="hidden sm:inline">掼蛋</span>
          </Link>

          {/* 桌面导航 */}
          <div className="hidden md:flex items-center gap-1">
            {mainLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={[
                  'px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150',
                  isActive(link.href)
                    ? 'bg-neutral-100 text-neutral-900'
                    : 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50',
                ].join(' ')}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* 用户头像 + 下拉 */}
          <div className="hidden md:flex items-center gap-2 relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-neutral-50 transition-colors duration-150"
            >
              <Avatar name="我" size="sm" />
            </button>
            <div className={[
              'absolute right-0 top-full mt-1 w-36 rounded-lg border border-neutral-200 bg-white shadow-lg py-1',
              'transition-all duration-150 ease-out origin-top-right',
              userMenuOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none',
            ].join(' ')}>
              {userMenuLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setUserMenuOpen(false)}
                  className={[
                    'block px-4 py-2 text-sm transition-colors duration-150',
                    isActive(link.href)
                      ? 'bg-neutral-100 text-neutral-900'
                      : 'text-neutral-600 hover:bg-neutral-50',
                  ].join(' ')}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* 移动端汉堡菜单 */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="touch-target flex items-center justify-center md:hidden rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 active:scale-90 transition-all duration-150"
            aria-label={mobileMenuOpen ? '关闭菜单' : '打开菜单'}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              {mobileMenuOpen ? (
                <path d="M5 5l10 10M15 5l-10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              ) : (
                <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* 移动端菜单 */}
      <div className={[
        'border-t border-neutral-200 bg-white md:hidden',
        'transition-all duration-200 ease-out origin-top',
        mobileMenuOpen ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-0 h-0 overflow-hidden',
      ].join(' ')}>
        <div className="mx-auto max-w-6xl px-4 py-3 space-y-1">
          {mainLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={[
                'block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150',
                isActive(link.href)
                  ? 'bg-neutral-100 text-neutral-900'
                  : 'text-neutral-500 hover:bg-neutral-50',
              ].join(' ')}
            >
              {link.label}
            </Link>
          ))}
          <hr className="my-2 border-neutral-200" />
          {userMenuLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm text-neutral-500 hover:bg-neutral-50 transition-colors duration-150"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
