# GuanDan4 项目状态快照 v2.0

> **日期**: 2026-05-13  
> **Git 标签**: v2.0-baseline-20260513  
> **Git 提交**: 8443ea9  
> **PRD**: docs/PRD-v2.0-optimization.md  

---

## 1. 代码状态

| 项目 | 状态 |
|------|------|
| 框架 | Next.js 16.2.6 (Turbopack) |
| TypeScript | 严格模式, 无错误 |
| 测试 | 289 passed / 8 files / Vitest |
| 构建 | Compiled successfully |
| 分支 | master (clean, 1 commit ahead of origin) |

## 2. 前端服务器 (ECS)

| 项目 | 值 |
|------|-----|
| IP | 8.136.23.108 |
| 网站 | http://8.136.23.108:3000 |
| SSH | administrator@8.136.23.108:22 |
| 系统 | Windows Server (IZ61XB310M83XUZ) |
| 项目路径 | C:\guandan4-master |
| Node | C:\node-v22.14.0-win-x64 |
| 进程管理 | schtasks /tn Guandan4Server |
| 启动脚本 | C:\guandan4-master\start_gd4.bat |

### 部署命令
```bash
python scripts/deploy-windows.py
```

### 手动部署
```bash
# 上传文件
scp src/... administrator@8.136.23.108:C:/guandan4-master/src/...

# SSH连接
ssh administrator@8.136.23.108

# 构建重启
cd /d C:\guandan4-master
set PATH=C:\node-v22.14.0-win-x64;%PATH%
npm run build
schtasks /run /tn Guandan4Server
```

## 3. 数据库 (Supabase)

| 项目 | 值 |
|------|-----|
| URL | https://rzzywltxlfgucngfiznx.supabase.co |
| 迁移文件 | supabase/migrations/20260429_phase3_init.sql |

### 表结构

**rooms**: id(uuid), name, type, status, level_rank, max_players, created_by, created_at

**room_members**: id, room_id→rooms, user_id→auth.users, seat_no(0-3), is_ready, is_online, last_heartbeat

**turns**: id(bigserial), room_id→rooms, game_id, turn_no, seat_no, action_type, payload(jsonb), created_at

### RLS 策略
- rooms: 任何人可读, 创建者可写
- room_members: 认证用户可读, 自己可写
- turns: 同房间成员可读, 任何人可插入

### Realtime 启用
- rooms, room_members, turns

## 4. 已完成的优化 (v2.0)

1. 手牌区宽度 max-w-4xl→max-w-6xl, overlap -1.9→-2.3rem, scale 1.4→1.15
2. 操作栏从右下角悬浮→手牌下方居中
3. 内页 max-w-2xl→max-w-3xl (profile/friends/leaderboard)
4. 2xl断点优化: 首页/大厅 grid-cols-4, 牌桌 max-w-[90rem]
5. Hero 添加 max-w-5xl 容器
6. Scoreboard 桌面端扩展显示级牌/局数/轮数
7. 大厅右键菜单边界检测
8. 横屏检测桌面端跳过轮询
9. Footer flex布局替代 min-h-calc

## 5. 恢复步骤

### 代码恢复
```bash
git checkout v2.0-baseline-20260513
```

### 数据库恢复
通过 Supabase Dashboard → Database → Restore

### ECS 恢复
```bash
python scripts/deploy-windows.py
```

### 服务恢复
```bash
ssh administrator@8.136.23.108 "schtasks /run /tn Guandan4Server"
```
