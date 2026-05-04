# 阶段 3 联网对战实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 接入 Supabase 实现 4 人远程实时对战 — 匿名认证、房间系统、Broadcast 实时出牌同步、turns 持久化、RLS 安全策略。

**Architecture:** 新增网络层封装 Supabase（client/auth/rooms/realtime）。规则引擎保持不变。混合同步模式：Broadcast 快路径 + turns 表持久化。客户端验证所有出牌。

**Tech Stack:** Next.js 16, Supabase JS SDK, Zustand 5.x, TypeScript 5.x, Vitest

---

## 文件结构

```
新建:
  .env.local                          # Supabase 环境变量
  src/lib/supabase/client.ts          # Supabase 客户端单例
  src/lib/supabase/client.test.ts     # 客户端测试
  src/lib/supabase/auth.ts            # 匿名认证
  src/lib/supabase/auth.test.ts       # 认证测试
  src/lib/supabase/rooms.ts           # 房间 CRUD
  src/lib/supabase/rooms.test.ts      # 房间测试
  src/lib/supabase/realtime.ts        # Broadcast 通道管理
  src/lib/supabase/realtime.test.ts   # 实时测试
  src/lib/store/room.ts               # useRoomStore (Zustand)
  src/lib/hooks/useRealtime.ts        # React Broadcast hook
  src/lib/game/supabase-bridge.ts     # 规则引擎↔网络桥接

修改:
  package.json                        # 添加 @supabase/supabase-js
  src/app/lobby/page.tsx              # 接入真实房间
  src/app/room/[roomId]/page.tsx      # 接入实时同步
```

---

### Task 0: 安装依赖和配置环境

**Files:**
- Modify: `package.json`
- Create: `.env.local`

- [ ] **Step 1: 安装 Supabase JS SDK**

```bash
cd D:\Learn-Claude\GuanDan4 && pnpm add @supabase/supabase-js
```

- [ ] **Step 2: 创建 .env.local**

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://rzzywltxlfgucngfiznx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enl3bHR4bGZndWNuZ2Zpem54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNTM1NjksImV4cCI6MjA4NDYyOTU2OX0.Upn1XmBZPQxYPl2UAVpGOtWim3Pf3yeeGNNMQm0idtM
```

- [ ] **Step 3: 验证安装**

```bash
node -e "const { createClient } = require('@supabase/supabase-js'); console.log('OK');"
```

Expected: `OK`

---

### Task 1: Supabase 客户端和 SQL 迁移

**Files:**
- Create: `src/lib/supabase/client.ts`

- [ ] **Step 1: 创建 Supabase 客户端单例**

```typescript
// src/lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});
```

- [ ] **Step 2: 在 Supabase SQL Editor 中执行建表语句**

```sql
-- 清除旧数据
delete from turns;
delete from room_members;
delete from rooms;

-- 房间表
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check(type in ('practice','battle')),
  status text not null default 'waiting' check(status in ('waiting','playing','finished')),
  level_rank int not null default 2,
  max_players int not null default 4,
  created_by uuid references auth.users,
  created_at timestamptz default now()
);

-- 房间成员表
create table if not exists room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms on delete cascade not null,
  user_id uuid references auth.users not null,
  seat_no int not null check(seat_no between 0 and 3),
  is_ready boolean default false,
  is_online boolean default true,
  last_heartbeat timestamptz default now(),
  unique(room_id, seat_no),
  unique(room_id, user_id)
);

-- 出牌记录表
create table if not exists turns (
  id bigserial primary key,
  room_id uuid references rooms on delete cascade not null,
  game_id uuid not null,
  turn_no int not null,
  seat_no int not null,
  action_type text not null check(action_type in ('play','pass')),
  payload jsonb,
  created_at timestamptz default now()
);

-- Enable Realtime
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table room_members;
alter publication supabase_realtime add table turns;

-- RLS 策略
alter table rooms enable row level security;
alter table room_members enable row level security;
alter table turns enable row level security;

create policy "rooms_read_all" on rooms for select using (true);
create policy "rooms_insert_own" on rooms for insert with check (auth.uid() = created_by);
create policy "rooms_update_own" on rooms for update using (auth.uid() = created_by);

create policy "members_read_room" on room_members for select
  using (room_id in (select room_id from room_members where user_id = auth.uid()));
create policy "members_insert_own" on room_members for insert with check (auth.uid() = user_id);
create policy "members_delete_own" on room_members for delete using (auth.uid() = user_id);

create policy "turns_read_room" on turns for select
  using (room_id in (select room_id from room_members where user_id = auth.uid()));
create policy "turns_insert_all" on turns for insert with check (true);

-- 索引
create index if not exists idx_room_members_room on room_members(room_id);
create index if not exists idx_turns_room_game on turns(room_id, game_id);
```

- [ ] **Step 3: 验证 TypeScript 编译**

```bash
npx tsc --noEmit
```

---

### Task 2: 匿名认证 (auth.ts)

**Files:**
- Create: `src/lib/supabase/auth.ts`
- Create: `src/lib/supabase/auth.test.ts`

- [ ] **Step 1: 编写认证测试**

```typescript
// src/lib/supabase/auth.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { getOrCreateUser, getUserId, signOut } from './auth';

describe('匿名认证', () => {
  it('getOrCreateUser 应返回用户 ID', async () => {
    const userId = await getOrCreateUser();
    expect(userId).toBeTruthy();
    expect(typeof userId).toBe('string');
  });

  it('getUserId 应在已有会话时返回用户 ID', () => {
    const userId = getUserId();
    expect(userId).toBeTruthy();
  });

  it('getUserId 应在无会话时返回 null', async () => {
    await signOut();
    const userId = getUserId();
    expect(userId).toBeNull();
  });

  it('再次调用 getOrCreateUser 应创建新会话', async () => {
    const userId = await getOrCreateUser();
    expect(userId).toBeTruthy();
  });
});
```

- [ ] **Step 2: 实现 auth.ts**

```typescript
// src/lib/supabase/auth.ts
import { supabase } from './client';

let cachedUserId: string | null = null;

export async function getOrCreateUser(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user?.id) {
    cachedUserId = session.user.id;
    return session.user.id;
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  if (!data.user?.id) throw new Error('匿名登录失败');

  cachedUserId = data.user.id;
  return data.user.id;
}

export function getUserId(): string | null {
  if (cachedUserId) return cachedUserId;
  return supabase.auth.getSession().then(
    ({ data: { session } }) => session?.user?.id || null
  ).catch(() => null) as unknown as null;
}

// 同步版本（从缓存读取）
export function getUserIdSync(): string | null {
  return cachedUserId;
}

export async function signOut(): Promise<void> {
  cachedUserId = null;
  await supabase.auth.signOut();
}
```

- [ ] **Step 3: 运行测试**

```bash
npx vitest run src/lib/supabase/auth.test.ts
```

Expected: 4/4 PASS

---

### Task 3: 房间 CRUD (rooms.ts)

**Files:**
- Create: `src/lib/supabase/rooms.ts`
- Create: `src/lib/supabase/rooms.test.ts`

- [ ] **Step 1: 编写 rooms 类型和测试**

```typescript
// src/lib/supabase/rooms.test.ts 中的类型定义
interface Room {
  id: string;
  name: string;
  type: 'practice' | 'battle';
  status: 'waiting' | 'playing' | 'finished';
  level_rank: number;
  max_players: number;
  created_by: string;
  created_at: string;
}

interface RoomMember {
  id: string;
  room_id: string;
  user_id: string;
  seat_no: number;
  is_ready: boolean;
  is_online: boolean;
}
```

- [ ] **Step 2: 实现 rooms.ts — 核心 CRUD 函数**

```typescript
// src/lib/supabase/rooms.ts
import { supabase } from './client';
import { getUserIdSync } from './auth';

export interface Room {
  id: string;
  name: string;
  type: 'practice' | 'battle';
  status: 'waiting' | 'playing' | 'finished';
  level_rank: number;
  max_players: number;
  created_by: string;
  created_at: string;
}

// 房间内成员信息（含 seat_no）
export interface RoomMember {
  id?: string;
  room_id: string;
  user_id: string;
  seat_no: number;
  is_ready?: boolean;
}

// 给 UI 用的聚合数据
export interface RoomWithMembers {
  room: Room;
  members: RoomMember[];
  playerCount: number;
}

/** 获取房间列表 */
export async function fetchRooms(): Promise<RoomWithMembers[]> {
  const { data: rooms, error } = await supabase
    .from('rooms')
    .select('*, room_members(*)')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (rooms || []).map((r: any) => ({
    room: {
      id: r.id,
      name: r.name,
      type: r.type,
      status: r.status,
      level_rank: r.level_rank,
      max_players: r.max_players,
      created_by: r.created_by,
      created_at: r.created_at,
    },
    members: (r.room_members || []).map((m: any) => ({
      id: m.id,
      room_id: m.room_id,
      user_id: m.user_id,
      seat_no: m.seat_no,
      is_ready: m.is_ready,
    })),
    playerCount: (r.room_members || []).length,
  }));
}

/** 创建房间 */
export async function createRoom(
  name: string,
  type: 'practice' | 'battle'
): Promise<Room> {
  const userId = getUserIdSync();
  if (!userId) throw new Error('未登录');

  const { data, error } = await supabase
    .from('rooms')
    .insert({
      name,
      type,
      created_by: userId,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Room;
}

/** 加入房间（分配座位） */
export async function joinRoom(roomId: string): Promise<number> {
  const userId = getUserIdSync();
  if (!userId) throw new Error('未登录');

  // 取出已有成员，找到第一个空座位
  const { data: members, error: fetchErr } = await supabase
    .from('room_members')
    .select('seat_no')
    .eq('room_id', roomId);

  if (fetchErr) throw fetchErr;

  const takenSeats = new Set((members || []).map((m) => m.seat_no));
  let seatNo = -1;
  for (let s = 0; s < 4; s++) {
    if (!takenSeats.has(s)) { seatNo = s; break; }
  }
  if (seatNo === -1) throw new Error('房间已满');

  const { error } = await supabase
    .from('room_members')
    .insert({ room_id: roomId, user_id: userId, seat_no: seatNo });

  if (error) throw error;
  return seatNo;
}

/** 离开房间 */
export async function leaveRoom(roomId: string): Promise<void> {
  const userId = getUserIdSync();
  if (!userId) return;

  await supabase
    .from('room_members')
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', userId);
}
```

- [ ] **Step 3: 运行测试**

```bash
npx vitest run src/lib/supabase/rooms.test.ts
```

---

### Task 4: Broadcast 实时通道 (realtime.ts)

**Files:**
- Create: `src/lib/supabase/realtime.ts`

- [ ] **Step 1: 实现 Broadcast 通道封装**

```typescript
// src/lib/supabase/realtime.ts
import { supabase } from './client';
import type { Card } from '@/lib/game/types';

export type GameEvent =
  | { type: 'play'; seatNo: number; cards: Card[]; turnNo: number }
  | { type: 'pass'; seatNo: number; turnNo: number }
  | { type: 'game_start'; gameId: string };

type EventHandler = (event: GameEvent) => void;

/** 创建房间 Broadcast 通道 */
export function createGameChannel(
  roomId: string,
  onEvent: EventHandler
) {
  const channel = supabase.channel(`game:${roomId}`, {
    config: { broadcast: { self: false } },
  });

  channel.on('broadcast', { event: 'game_event' }, (payload) => {
    onEvent(payload.payload as GameEvent);
  }).subscribe();

  return channel;
}

/** 发送游戏事件到通道 */
export async function sendGameEvent(
  roomId: string,
  event: GameEvent
): Promise<void> {
  await supabase.channel(`game:${roomId}`).send({
    type: 'broadcast',
    event: 'game_event',
    payload: event,
  });
}
```

---

### Task 5: Room Zustand Store

**Files:**
- Create: `src/lib/store/room.ts`

- [ ] **Step 1: 创建 useRoomStore**

```typescript
// src/lib/store/room.ts
import { create } from 'zustand';
import type { RoomWithMembers } from '@/lib/supabase/rooms';
import { fetchRooms, createRoom, joinRoom, leaveRoom } from '@/lib/supabase/rooms';
import { getOrCreateUser, getUserIdSync } from '@/lib/supabase/auth';

interface RoomStore {
  rooms: RoomWithMembers[];
  currentRoomId: string | null;
  mySeat: number | null;
  userId: string | null;
  loading: boolean;
  error: string | null;

  init: () => Promise<void>;
  loadRooms: () => Promise<void>;
  createAndJoin: (name: string, type: 'practice' | 'battle') => Promise<string>;
  join: (roomId: string) => Promise<void>;
  leave: () => Promise<void>;
}

export const useRoomStore = create<RoomStore>((set, get) => ({
  rooms: [],
  currentRoomId: null,
  mySeat: null,
  userId: null,
  loading: false,
  error: null,

  init: async () => {
    set({ loading: true });
    try {
      const userId = await getOrCreateUser();
      set({ userId });
      await get().loadRooms();
    } catch (e: any) {
      set({ error: e.message });
    } finally {
      set({ loading: false });
    }
  },

  loadRooms: async () => {
    const rooms = await fetchRooms();
    set({ rooms });
  },

  createAndJoin: async (name, type) => {
    const room = await createRoom(name, type);
    const seat = await joinRoom(room.id);
    set({ currentRoomId: room.id, mySeat: seat });
    await get().loadRooms();
    return room.id;
  },

  join: async (roomId) => {
    const seat = await joinRoom(roomId);
    set({ currentRoomId: roomId, mySeat: seat });
    await get().loadRooms();
  },

  leave: async () => {
    const { currentRoomId } = get();
    if (currentRoomId) {
      await leaveRoom(currentRoomId);
      set({ currentRoomId: null, mySeat: null });
      await get().loadRooms();
    }
  },
}));
```

---

### Task 6: useRealtime Hook

**Files:**
- Create: `src/lib/hooks/useRealtime.ts`

- [ ] **Step 1: 创建 useRealtime hook**

```typescript
// src/lib/hooks/useRealtime.ts
'use client';

import { useEffect, useRef } from 'react';
import { createGameChannel, sendGameEvent, type GameEvent } from '@/lib/supabase/realtime';

export function useRealtime(
  roomId: string | null,
  onEvent: (event: GameEvent) => void
) {
  const channelRef = useRef<ReturnType<typeof createGameChannel> | null>(null);

  useEffect(() => {
    if (!roomId) return;

    const channel = createGameChannel(roomId, onEvent);
    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const send = async (event: GameEvent) => {
    if (!roomId) return;
    await sendGameEvent(roomId, event);
  };

  return { send };
}
```

这个 hook 需要导入 supabase 实例。修正确保引用正确。

---

### Task 7: 游戏-网络桥接 (supabase-bridge.ts)

**Files:**
- Create: `src/lib/game/supabase-bridge.ts`

- [ ] **Step 1: 实现桥接层**

```typescript
// src/lib/game/supabase-bridge.ts
import { supabase } from '@/lib/supabase/client';
import type { Card, TurnRecord } from './types';

/** 持久化出牌记录到 turns 表（异步，不等待） */
export async function persistTurn(
  roomId: string,
  gameId: string,
  turnNo: number,
  seatNo: number,
  actionType: 'play' | 'pass',
  cards?: Card[]
): Promise<void> {
  supabase.from('turns').insert({
    room_id: roomId,
    game_id: gameId,
    turn_no: turnNo,
    seat_no: seatNo,
    action_type: actionType,
    payload: cards ? { cards } : null,
  }).then(({ error }) => {
    if (error) console.error('持久化出牌失败:', error);
  });
}

/** 从 turns 表回放历史记录（断线重连用） */
export async function replayTurns(
  roomId: string,
  gameId: string,
  fromTurnNo: number
): Promise<TurnRecord[]> {
  const { data, error } = await supabase
    .from('turns')
    .select('*')
    .eq('room_id', roomId)
    .eq('game_id', gameId)
    .gte('turn_no', fromTurnNo)
    .order('turn_no', { ascending: true });

  if (error) throw error;

  return (data || []).map((t: any) => ({
    turnNo: t.turn_no,
    seatNo: t.seat_no,
    type: t.action_type,
    cards: t.payload?.cards || undefined,
  }));
}
```

---

### Task 8: UI 接入 — 大厅 + 房间

**Files:**
- Modify: `src/app/lobby/page.tsx`
- Modify: `src/app/room/[roomId]/page.tsx`

- [ ] **Step 1: 大厅页面接入真实房间**

关键改动：
- 页面加载时调用 `useRoomStore.init()`
- `createRoom` → `useRoomStore.createAndJoin()`
- 加入房间 → `useRoomStore.join(roomId)`
- 用 store.rooms 替换 mockRooms

```typescript
// 在 lobby/page.tsx 顶部
'use client';
import { useEffect } from 'react';
import { useRoomStore } from '@/lib/store/room';
// ...

export default function LobbyPage() {
  const { rooms, loading, init, createAndJoin, join } = useRoomStore();
  // ...
  useEffect(() => { init(); }, []);
  // 渲染 rooms 替代 mockRooms
}
```

- [ ] **Step 2: 房间页面接入实时同步**

关键改动：
- 页面加载时连接 Broadcast 通道
- playCards → 本地执行 + send GameEvent + persistTurn
- passTurn → 本地执行 + send GameEvent + persistTurn
- 收到远程事件 → 调用 store 方法更新状态

- [ ] **Step 3: 验证构建**

```bash
npx next build
```

Expected: 零错误

---

### Task 9: 集成测试 — 两端通信

**Files:**
- Create: `src/lib/supabase/integration.test.ts`

- [ ] **Step 1: 编写两端通信集成测试**

测试流程：
1. 两个"用户"匿名登录
2. UserA 创建房间
3. UserB 加入房间
4. UserA 出牌 → Broadcast 发送
5. UserB 收到事件 → 本地验证通过
6. 持久化到 turns 表
7. 验证 turns 表数据正确

- [ ] **Step 2: 运行全部测试**

```bash
npx vitest run
```

---

## 执行摘要

| 任务 | 模块 | 预计时间 |
|------|------|---------|
| 0 | 依赖+环境 | 5min |
| 1 | SQL迁移 | 10min |
| 2 | 匿名认证 | 15min |
| 3 | 房间CRUD | 20min |
| 4 | Broadcast | 15min |
| 5 | Room Store | 15min |
| 6 | useRealtime | 10min |
| 7 | 桥接层 | 10min |
| 8 | UI接入 | 25min |
| 9 | 集成测试 | 15min |

**总计**: 约 2.5 小时

**关键风险**: SQL 迁移需要在 Supabase Dashboard 手动执行；Broadcast 通道的 self:false 配置需要验证实际行为。
