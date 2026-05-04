# 阶段 3 联网对战设计规格

> 日期: 2026-04-29 | 状态: 已批准

## 1. 目标

接入 Supabase 后端，实现 4 人远程实时对战。用户通过匿名认证加入房间，出牌通过 Broadcast 实时同步，turns 表异步持久化。

## 2. 架构

```
UI 层 → Zustand Store(阶段2+新增 room store) → 网络层(Supabase) → 规则引擎(阶段2纯函数)
```

网络层为新增层，封装 Supabase Auth / Database / Realtime。规则引擎保持不变，不依赖网络。

## 3. Supabase 配置

复用 guandan3-web 的 Supabase 项目：
- URL: https://rzzywltxlfgucngfiznx.supabase.co
- 认证: 匿名登录 (signInAnonymously)
- 数据可清除重建

## 4. 数据库表

- **rooms**: id, name, type, status, level_rank, max_players, created_by, created_at
- **room_members**: id, room_id, user_id, seat_no, is_ready, is_online, last_heartbeat (unique: room+seat, room+user)
- **turns**: id, room_id, game_id, turn_no, seat_no, action_type(play/pass), payload(jsonb), created_at

## 5. 实时同步（混合模式）

- 快路径: Supabase Broadcast 通道直接发送出牌事件（<100ms）
- 持久化: 异步 INSERT 到 turns 表
- 接收端本地 validatePlay() 验证后更新状态
- 游戏逻辑完全由客户端规则引擎驱动，服务端仅做消息转发

## 6. RLS 安全策略

- rooms: 任何人可读，创建者可写
- room_members: 同房间成员可读
- turns: 同房间成员可读，任何人可插入

## 7. 新增文件

```
src/lib/supabase/client.ts      # Supabase 客户端单例
src/lib/supabase/auth.ts        # 匿名登录/登出
src/lib/supabase/rooms.ts       # 房间 CRUD
src/lib/supabase/realtime.ts    # Broadcast 通道封装
src/lib/store/room.ts           # useRoomStore (Zustand)
src/lib/hooks/useRealtime.ts    # React hook
src/lib/game/supabase-bridge.ts # 规则引擎↔网络层桥接
```

## 8. 测试策略

- 单元测试: auth/rooms/realtime 各模块独立测试
- 集成测试: 两个客户端创建房间→加入→出牌同步完整流程
- 使用 Vitest + Supabase 本地或测试项目

## 9. 不做什么

- 不实现 AI（阶段 4）
- 不实现音效/动画（阶段 5）
- 不实现好友系统集成
- 不实现排行榜持久化
