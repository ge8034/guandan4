'use client';

import { useState, type ReactNode } from 'react';

interface Tab {
  key: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultKey?: string;
  onChange?: (key: string) => void;
}

export function Tabs({ tabs, defaultKey, onChange }: TabsProps) {
  const [activeKey, setActiveKey] = useState(defaultKey || tabs[0]?.key || '');

  const handleTabClick = (key: string) => {
    setActiveKey(key);
    onChange?.(key);
  };

  return (
    <div>
      {/* 标签栏 */}
      <div className="flex border-b border-neutral-200" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={tab.key === activeKey}
            className={[
              'relative px-4 py-2.5 text-sm font-medium transition-all duration-150 ease-out',
              'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent',
              'touch-target active:scale-95',
              tab.key === activeKey
                ? 'text-accent-dark'
                : 'text-neutral-500 hover:text-neutral-700',
            ].join(' ')}
            onClick={() => handleTabClick(tab.key)}
          >
            {tab.label}
            {tab.key === activeKey && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-accent" />
            )}
          </button>
        ))}
      </div>

      {/* 内容区 */}
      <div className="pt-4">
        {tabs.find((t) => t.key === activeKey)?.content}
      </div>
    </div>
  );
}
