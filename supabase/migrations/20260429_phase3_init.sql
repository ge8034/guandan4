-- GuanDan4 Phase 3 初始化迁移
-- 清除 guandan3-web 旧数据 + 创建新表结构

-- 1. 清除旧数据
delete from public.turns;
delete from public.room_members;
delete from public.rooms;

-- 2. 重建 rooms 表
drop table if exists public.scores cascade;
drop table if exists public.turns cascade;
drop table if exists public.game_hands cascade;
drop table if exists public.games cascade;
drop table if exists public.room_members cascade;
drop table if exists public.rooms cascade;
drop table if exists public.profiles cascade;

-- 3. 创建新表

-- 3.1 rooms
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check(type in ('practice', 'battle')),
  status text not null default 'waiting' check(status in ('waiting', 'playing', 'finished')),
  level_rank int not null default 2,
  max_players int not null default 4,
  created_by uuid references auth.users,
  created_at timestamptz default now()
);

-- 3.2 room_members
create table public.room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.rooms on delete cascade not null,
  user_id uuid references auth.users not null,
  seat_no int not null check(seat_no between 0 and 3),
  is_ready boolean default false,
  is_online boolean default true,
  last_heartbeat timestamptz default now(),
  unique(room_id, seat_no),
  unique(room_id, user_id)
);

-- 3.3 turns
create table public.turns (
  id bigserial primary key,
  room_id uuid references public.rooms on delete cascade not null,
  game_id uuid not null,
  turn_no int not null,
  seat_no int not null,
  action_type text not null check(action_type in ('play', 'pass')),
  payload jsonb,
  created_at timestamptz default now()
);

-- 4. 索引
create index if not exists idx_room_members_room on public.room_members(room_id);
create index if not exists idx_turns_room_game on public.turns(room_id, game_id);

-- 5. RLS 策略
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.turns enable row level security;

-- rooms: 任何人可读
create policy "rooms_read_all" on public.rooms for select using (true);
-- rooms: 创建者可插入/更新
create policy "rooms_insert_own" on public.rooms for insert with check (auth.uid() = created_by);
create policy "rooms_update_own" on public.rooms for update using (auth.uid() = created_by);
create policy "rooms_delete_own" on public.rooms for delete using (auth.uid() = created_by);

-- room_members: 同房间成员可读
create policy "members_read_room" on public.room_members for select
  using (room_id in (select room_id from public.room_members where user_id = auth.uid()));
-- room_members: 用户可插入/删除自己
create policy "members_insert_own" on public.room_members for insert with check (auth.uid() = user_id);
create policy "members_delete_own" on public.room_members for delete using (auth.uid() = user_id);

-- turns: 同房间成员可读
create policy "turns_read_room" on public.turns for select
  using (room_id in (select room_id from public.room_members where user_id = auth.uid()));
-- turns: 任何人可插入
create policy "turns_insert_all" on public.turns for insert with check (true);

-- 6. 权限
grant usage on schema public to anon, authenticated;
grant all on public.rooms to anon, authenticated;
grant all on public.room_members to anon, authenticated;
grant all on public.turns to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

-- 7. 启用 Realtime
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.room_members;
alter publication supabase_realtime add table public.turns;
