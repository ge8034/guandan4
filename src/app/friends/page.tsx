'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { mockFriends } from '@/mock/data';

export default function FriendsPage() {
  const [search, setSearch] = useState('');

  const filtered = mockFriends.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold text-neutral-900">好友</h1>
      <p className="mt-0.5 text-sm text-neutral-500">管理好友和查看在线状态</p>

      {/* 搜索 */}
      <div className="mt-6 flex gap-3">
        <div className="flex-1">
          <Input
            placeholder="搜索好友..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline">添加好友</Button>
      </div>

      {/* 好友列表 */}
      <div className="mt-6 space-y-2">
        {filtered.map((friend) => (
          <Card key={friend.id} variant="hoverable" padding="md" className="flex items-center gap-4">
            <Avatar name={friend.name} size="md" online={friend.online} />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-neutral-900 truncate">{friend.name}</div>
              <div className="text-xs text-neutral-400">{friend.level} -- 胜率 {friend.winRate}</div>
            </div>
            <Badge variant={friend.online ? 'success' : 'default'}>
              {friend.online ? '在线' : '离线'}
            </Badge>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="py-12 text-center text-sm text-neutral-400">没有找到匹配的好友</p>
        )}
      </div>
    </main>
  );
}
