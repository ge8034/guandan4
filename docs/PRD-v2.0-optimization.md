# GuanDan4 桌面端游戏体验优化 PRD

> **版本**: v2.0.0  
> **创建日期**: 2026-05-13  
> **基准提交**: 8443ea9 (桌面端布局优化已完成)  
> **ECS服务器**: 8.136.23.108:3000 / Windows Server / C:\guandan4-master  
> **状态**: 待执行

---

## 0. 项目状态快照

| 状态项 | 值 | 说明 |
|--------|-----|------|
| Git 分支 | master | |
| 基准提交 | 8443ea9 | fix: 桌面端布局优化 |
| ECS IP | 8.136.23.108:3000 | HTTP 200 正常 |
| ECS 系统 | Windows Server | administrator@IZ61XB310M83XUZ |
| ECS 项目路径 | C:\guandan4-master | |
| ECS Node | C:\node-v22.14.0-win-x64 | |
| ECS 进程管理 | schtasks /tn Guandan4Server | 开机自启 |
| ECS 启动脚本 | C:\guandan4-master\start_gd4.bat | |
| 本地项目路径 | D:\Learn-Claude\GuanDan4 | |
| Node | v22.14.0 | |
| 测试 | 289 passed / 8 files | Vitest |

---

## 1. PRD 概述

基于三阶段分析的综合优化需求：
- **阶段A**: 桌面端布局结构审查（12 问题 → 已修复部署）
- **阶段B**: Impeccable-Design 设计规范审查（20 问题）
- **阶段C**: QQ掼蛋/JJ斗地主竞品对比（15 差距项）

共识别 **47 个优化项**，按优先级分为 P0/P1/P2/P3 四个级别。

---

## 2. P0 — 必须修复（影响可用性和竞争力）

### 2.1 记牌器组件（对标 QQ掼蛋）

**需求**: 牌桌左侧新增常驻记牌器面板，显示 2-A + 小王 + 大王的剩余数量。

**参照**: QQ掼蛋左侧 `CardCounterWidget` 组件。

**实现**:
- 新组件 `src/components/game/CardCounter.tsx`
- 数据来源：`108 - 四个玩家手牌总和`（从 gameStore.hands 计算）
- 布局：左侧 `w-32` 面板，2列网格（花色点数 + 剩余数量）
- 显示：已出完的牌灰掉，剩余 ≤2 张的红色高亮
- 集成到 `room/[roomId]/page.tsx` 牌桌左侧

**验收**: 牌桌左侧出现记牌器，牌局进行中数量实时更新。

---

### 2.2 出牌计时器（对标 JJ斗地主）

**需求**: 每位玩家出牌有 30 秒倒计时，超时自动过牌。

**实现**:
- 在 GameStatusBar 或出牌区旁添加倒计时组件
- 使用 `gameStore.currentSeat` + `Date.now()` 计算已用时间
- 最后 5 秒变红 + 加速动画（`animate-pulse` 仅用于 ≤5s）
- 超时自动调用 `passTurn()`

**验收**: 轮到玩家时显示倒计时，最后5秒红色闪烁，超时自动过牌。

---

### 2.3 卡牌露出率提升（对标 QQ掼蛋 25-30%）

**当前值**: `--card-overlap: -2.3rem`，露出 16.4%

**目标值**: 露出 28%

**计算**:
- md卡宽44px，露出28% = 12.3px
- overlap = 44 - 12.3 = 31.7px ≈ `-1.98rem`
- 27张牌总宽 = 44 + 26×12.3 = 363.8px
- scale 1.05: 382px → max-w-6xl=1152px ✓ 充裕

**修改**:
- `globals.css`: `--card-overlap: -2.3rem` → `-2.0rem`
- `globals.css`: `--my-hand-scale: 1.15` → `1.05`
- `room/page.tsx`: `max-w-6xl` → `max-w-5xl`（手牌宽度需求降低）

**验收**: 桌面端27张牌全部可见，每张牌的花色点数可辨识。

---

### 2.4 选牌视觉反馈强化（对标 QQ掼蛋）

**当前**: 选中仅 `-translate-y-3` + 右下角 `border-accent`

**目标**: 位移 + 发光环 + 亮度提升（3通道反馈）

**修改 `PlayingCard.tsx`**:
```tsx
// 选中态 class
selected: 'ring-2 ring-accent/60 brightness-110 -translate-y-3 shadow-lg shadow-accent/20'
```

**验收**: 选中卡牌明显区别于未选中（光环+亮度+位移三通道），在 27 张重叠牌中可快速定位已选牌。

---

### 2.5 Modal 焦点陷阱（WCAG 违规）

**需求**: Tab 键在 Modal 内部循环，不会跳出到遮罩后方元素。

**实现**:
- Modal.tsx 添加 useEffect 焦点陷阱
- 查询 Modal 内所有 focusable 元素
- Tab/Shift+Tab 循环焦点

**验收**: Tab 键遍历 Modal 所有可聚焦元素，循环不会跳出。

---

## 3. P1 — 体验提升

### 3.1 左侧信息面板（对标 QQ掼蛋）

整合当前 Scoreboard + GameStatusBar 为统一左侧面板：
- 记牌器（P0-2.1）
- 队伍升级进度
- 当前级牌
- 局数/轮数
- 房间名 + 状态

### 3.2 炸弹/胜利全屏特效（对标 JJ斗地主）

- 炸弹：全屏 200ms 金色闪光 + 震屏效果
- 胜利：彩带/粒子动画
- 使用 CSS `@keyframes` + transform/opacity only

### 3.3 自动理牌（对标 QQ掼蛋）

- 手牌按牌型自动分组排列（炸弹→顺子→对子→单张）
- 同花顺高亮
- 保留手动锁牌功能

### 3.4 AI 思考等待提示

- AI 回合时显示"等待中"动画（头像旁呼吸环）
- 对手思考时不再像"卡住"

### 3.5 信息架构整合

- 合并 Scoreboard + GameStatusBar 为统一的 `GameInfoPanel`
- 消除桌面端信息冗余

---

## 4. P2 — 设计规范修复

### 4.1 动画规范统一

| # | 问题 | 文件 | 修复 |
|---|------|------|------|
| 1 | `duration-250` 无效类名 | Card.tsx:30 | `duration-[250ms]` |
| 2 | `focus:` → `focus-visible:` | Input.tsx:34 | 改 class |
| 3 | `ease` → `ease-out` | Modal.tsx:52 | 添加 `ease-out` |
| 4 | `ease-in-out` → `var(--ease-out)` | globals.css:359 | 改值 |
| 5 | active:scale 统一为 `[0.97]` | Nav,Modal,Tabs | 改 class |
| 6 | breathe-dot 改为 opacity 动画 | globals.css:369 | 重写 keyframes |
| 7 | 移除 `animate-pulse` 错误闪烁 | room/page.tsx:547 | 删除 class |

### 4.2 配色规范修复

| # | 问题 | 文件 | 修复 |
|---|------|------|------|
| 8 | CardBacks 硬编码 hex → OKLCH token | room/page.tsx:32 | 定义 `--color-card-back` |
| 9 | PlayingCard `#e5e7eb` → oklch | PlayingCard.tsx:98 | 定义级牌高亮色 |
| 10 | `text-neutral-400` 对比度不足 | 40+ 处 | 改为 `text-neutral-500` |
| 11 | Avatar `border-white` → `border-white/80` | Avatar.tsx | 改 class |

### 4.3 间距规范修复

| # | 问题 | 文件 | 修复 |
|---|------|------|------|
| 12 | `px-3.5 py-2.5` → 4pt对齐 | Input,Button,Badge | `px-3 py-2` 或 `px-4 py-3` |
| 13 | `-ml-[19px]` → 基于 token | HandArea.tsx:143 | 关联 `--card-overlap` |

### 4.4 代码清理

| # | 问题 | 文件 |
|---|------|------|
| 14 | 空 CSS 规则删除 | globals.css:583-587 |
| 15 | 字体注释修正 | globals.css:74 |

---

## 5. P3 — 增强优化

### 5.1 出牌区展示优化

- 多张出牌展开排列（不重叠），参照 QQ掼蛋
- 当前回合出牌高亮边框

### 5.2 快捷操作

- 双击手牌直接出牌（选中 + 出牌一步完成）
- 空格键出牌快捷支持

### 5.3 字体层级优化

- 玩家名: 12px → 14px
- 新增 13px 中间层级（`text-sm` = 14px 与 `text-xs` = 12px 之间用 `text-[13px]`）

### 5.4 投牌动画增强

- 添加牌面翻转过程（3D transform rotateY）

### 5.5 大厅卡片双 div 修复

- 移除 wrapper div，直接将 onClick 放在 Card 上

---

## 6. 执行计划

### 6.1 分批执行

| 批次 | 内容 | 预计工作量 | 优先级 |
|------|------|-----------|--------|
| Batch 1 | P0-2.3(露出率) + P0-2.4(选牌反馈) + P2规范修复 | 30min | **立即** |
| Batch 2 | P0-2.1(记牌器) + P0-2.2(计时器) | 2h | 本周 |
| Batch 3 | P1-3.1(信息面板) + P1-3.3(自动理牌) | 3h | 本周 |
| Batch 4 | P1-3.2(特效) + P1-3.4(AI提示) | 1.5h | 下周 |
| Batch 5 | P3 增强项 | 2h | 按需 |

### 6.2 每批验证

- `npm run build` 编译通过
- `npm test` 289 测试通过
- ECS 部署验证（http://8.136.23.108:3000）
- 手动测试新增功能

---

## 7. 基准备份（恢复点）

### 7.1 Git 标签

```bash
git tag v2.0-baseline-20260513 -m "PRD v2.0 基准: 桌面端布局优化完成，ECS正常运行"
```

### 7.2 数据库（Supabase）备份

**Supabase 项目信息**:
| 项目 | 值 |
|------|-----|
| URL | https://rzzywltxlfgucngfiznx.supabase.co |
| Anon Key | eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6enl3bHR4bGZndWNuZ2Zpem54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwNTM1NjksImV4cCI6MjA4NDYyOTU2OX0.Upn1XmBZPQxYPl2UAVpGOtWim3Pf3yeeGNNMQm0idtM |

**数据库表结构** (来自 `supabase/migrations/20260429_phase3_init.sql`):

| 表 | 字段 | 用途 |
|----|------|------|
| `rooms` | id(uuid), name, type(practice/battle), status(waiting/playing/finished), level_rank(2), max_players(4), created_by, created_at | 游戏房间 |
| `room_members` | id, room_id→rooms, user_id→auth.users, seat_no(0-3), is_ready, is_online, last_heartbeat | 房间成员 |
| `turns` | id(bigserial), room_id→rooms, game_id(uuid), turn_no(int), seat_no(int), action_type(play/pass), payload(jsonb), created_at | 出牌记录 |

**RLS 策略**: rooms 任何人可读/创建者可写, room_members 认证用户可读/自己可写, turns 同房间成员可读/任何人可插入

**Realtime**: rooms, room_members, turns 三表启用

**备份方式**: 
- 表结构已通过 migration 文件 (`supabase/migrations/20260429_phase3_init.sql`) 保存
- 运行中数据通过 Supabase Dashboard → Database → Backups 创建备份
- 或通过 `pg_dump` 导出:
  ```bash
  pg_dump -h aws-0-ap-southeast-1.pooler.supabase.com -p 6543 -U postgres -d postgres -f guandan4_db_backup_20260513.sql
  ```

### 7.3 ECS 服务器状态

| 项目 | 值 |
|------|-----|
| IP | 8.136.23.108 |
| 端口 | 3000 (HTTP), 22 (SSH) |
| 系统 | Windows Server |
| 用户名 | administrator |
| 项目路径 | C:\guandan4-master |
| Node 路径 | C:\node-v22.14.0-win-x64 |
| 进程管理 | schtasks /tn Guandan4Server (开机自启) |
| 启动脚本 | C:\guandan4-master\start_gd4.bat |
| 部署脚本 | scripts/deploy-windows.py |

### 7.4 恢复步骤

如需回滚到此状态：
```bash
# 1. 代码回滚
git checkout v2.0-baseline-20260513

# 2. 部署到 ECS
python scripts/deploy-windows.py

# 3. 数据库恢复（如需）
# 通过 Supabase Dashboard → Database → Restore 恢复备份
```

### 7.5 恢复步骤

如需回滚到此状态：
```bash
git checkout v2.0-baseline-20260513
# 部署到 ECS:
python scripts/deploy-windows.py
```

---

## 附录 A: 完整问题清单（47项）

参见各阶段报告：
- 阶段A: 布局结构 12 项（已修复）
- 阶段B: Impeccable-Design 20 项
- 阶段C: 竞品对比 15 项

## 附录 B: 关键文件路径

| 文件 | 用途 |
|------|------|
| `src/app/room/[roomId]/page.tsx` | 牌桌主页面 |
| `src/components/game/PlayingCard.tsx` | 单张卡牌 |
| `src/components/game/HandArea.tsx` | 手牌区 |
| `src/components/game/TableArea.tsx` | 出牌区 |
| `src/components/game/PlayerSeat.tsx` | 玩家座位 |
| `src/components/game/GameStatusBar.tsx` | 状态栏 |
| `src/components/game/Scoreboard.tsx` | 积分板 |
| `src/components/game/ActionBar.tsx` | 操作栏 |
| `src/components/game/DealAnimation.tsx` | 发牌动画 |
| `src/components/ui/Modal.tsx` | 弹窗 |
| `src/components/ui/Button.tsx` | 按钮 |
| `src/components/ui/Card.tsx` | 卡片容器 |
| `src/components/ui/Input.tsx` | 输入框 |
| `src/components/ui/Avatar.tsx` | 头像 |
| `src/components/ui/Badge.tsx` | 徽章 |
| `src/components/ui/Tabs.tsx` | 标签页 |
| `src/app/globals.css` | 全局样式+设计tokens |
| `src/app/layout.tsx` | 根布局 |
| `scripts/deploy-windows.py` | ECS部署脚本 |
| `scripts/start_gd4.bat` | ECS启动脚本 |
