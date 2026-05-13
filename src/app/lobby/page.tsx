'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { useRoomStore } from '@/lib/store/room';

const typeLabels: Record<string, string> = {
  practice: '练习',
  battle: '对战',
};

const statusLabels: Record<string, string> = {
  waiting: '等待中',
  playing: '进行中',
  finished: '已结束',
};

export default function LobbyPage() {
  const router = useRouter();
  const { rooms, currentRoomId, loading, error, init, createAndJoin, join, leave, loadRooms, remove } =
    useRoomStore();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomType, setNewRoomType] = useState<'practice' | 'battle'>('battle');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const deleteRoomIdRef = useRef<string | null>(null);

  useEffect(() => {
    init();
  }, [init]);

  const filtered = rooms.filter((r) =>
    r.room.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    if (!newRoomName.trim()) return;
    const roomId = await createAndJoin(newRoomName.trim(), newRoomType);
    setShowCreate(false);
    setNewRoomName('');
    router.push(`/room/${roomId}`);
  };

  const handleJoin = async (roomId: string) => {
    if (currentRoomId) await leave();
    await join(roomId);
    router.push(`/room/${roomId}`);
  };

  const handleDelete = async () => {
    const roomId = deleteRoomIdRef.current;
    if (!roomId) return;
    await remove(roomId);
    deleteRoomIdRef.current = null;
    setContextMenu(null);
  };

  const handleContextMenu = (e: React.MouseEvent, roomId: string) => {
    e.preventDefault();
    deleteRoomIdRef.current = roomId;
    const menuW = 120;
    const menuH = 44;
    const x = Math.min(e.clientX, window.innerWidth - menuW);
    const y = Math.min(e.clientY, window.innerHeight - menuH);
    setContextMenu({ x, y });
  };

  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {/* 顶部操作栏 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">游戏大厅</h1>
          <p className="mt-0.5 text-sm text-neutral-500">
            选择一个房间加入，或创建自己的房间
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={loadRooms}>
            刷新
          </Button>
          <Button variant="primary" onClick={() => setShowCreate(true)}>
            创建房间
          </Button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* 搜索栏 */}
      <div className="mt-6 max-w-sm">
        <Input
          placeholder="搜索房间名称..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* 房间列表 */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {filtered.map(({ room, playerCount }) => (
          <div
            key={room.id}
            onContextMenu={(e) => handleContextMenu(e, room.id)}
            onClick={() => handleJoin(room.id)}
            className="cursor-pointer"
          >
            <Card variant="hoverable" padding="lg" className="h-full">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-neutral-900">{room.name}</h3>
                <Badge variant="accent">{typeLabels[room.type]}</Badge>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-neutral-500">
                  {playerCount}/{room.max_players} 人
                </span>
                <span className="text-xs text-neutral-400">
                  {statusLabels[room.status]}
                </span>
              </div>
            </Card>
          </div>
        ))}
        {filtered.length === 0 && !loading && (
          <p className="col-span-full py-12 text-center text-sm text-neutral-400">
            没有找到匹配的房间，创建一个吧
          </p>
        )}
      </div>

      {/* 右键菜单 */}
      {contextMenu && (
        <div
          className="fixed z-50 rounded-lg border border-neutral-200 bg-white shadow-lg py-1 min-w-[120px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
            onClick={handleDelete}
          >
            删除房间
          </button>
        </div>
      )}

      {/* 创建房间弹窗 */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="创建房间">
        <div className="space-y-4">
          <Input
            label="房间名称"
            placeholder="输入房间名称"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
          />
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setNewRoomType('practice')}
              className={[
                'flex-1 rounded-lg border p-3 text-center text-sm transition-colors',
                newRoomType === 'practice'
                  ? 'border-accent bg-accent/5'
                  : 'border-neutral-200 bg-neutral-50 hover:border-accent',
              ].join(' ')}
            >
              <div className="font-medium text-neutral-900">练习房</div>
              <div className="text-xs text-neutral-400 mt-0.5">1v3 AI 练习</div>
            </button>
            <button
              type="button"
              onClick={() => setNewRoomType('battle')}
              className={[
                'flex-1 rounded-lg border p-3 text-center text-sm transition-colors',
                newRoomType === 'battle'
                  ? 'border-accent bg-accent/5'
                  : 'border-neutral-200 bg-neutral-50 hover:border-accent',
              ].join(' ')}
            >
              <div className="font-medium text-neutral-900">对战房</div>
              <div className="text-xs text-neutral-400 mt-0.5">4人实时对战</div>
            </button>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              取消
            </Button>
            <Button variant="primary" onClick={handleCreate} disabled={!newRoomName.trim()}>
              创建
            </Button>
          </div>
        </div>
      </Modal>
    </main>
  );
}
