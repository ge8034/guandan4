# 阶段 2 游戏引擎设计规格

> 日期: 2026-04-28 | 状态: 已批准

## 1. 目标

实现掼蛋完整规则引擎，支持本地全明牌单人模式：4 人手牌同时可见，手动操作所有座位打完一整局。

## 2. 架构

三层分离，规则层为纯函数：

```
UI 层 → Zustand Store → 规则层（纯函数）
```

规则层零依赖（不依赖 UI、网络、store），输入参数返回结果。

## 3. 模块设计

### 3.1 类型定义 — `src/lib/game/types.ts`

```typescript
type Suit = 'heart' | 'diamond' | 'club' | 'spade' | 'joker'
type HandType = 'single' | 'pair' | 'triple' | 'triple_pair' | 'straight' | 'sequence_pairs' | 'sequence_triples' | 'bomb' | 'rocket' | 'pass'

interface Card { suit: Suit; rank: string; value: number }
interface PlayedCards { type: HandType; cards: Card[]; score: number }
interface TurnRecord { turnNo: number; seatNo: number; type: 'play' | 'pass'; cards?: Card[] }
interface GameState { /* 见 PRD 6.3 */ }
```

### 3.2 牌组管理 — `deck.ts`

- `createDeck()`: 生成 108 张牌（2副 × 54）
- `shuffle(deck)`: Fisher-Yates 洗牌
- `deal(deck)`: 每人 27 张，按花色点数排序
- `getLevelRank(gameLevel)`: 返回当前级牌点数（2→A，A=1）

### 3.3 牌型判断引擎 — `rules.ts`（最复杂）

- `classifyHand(cards, levelRank)`: 识别牌型，处理逢人配
- `compareHands(a, b, levelRank)`: 比较两手牌大小
- `getHandScore(type, cards, levelRank)`: 计算牌型分值
- `getValidPlays(hand, lastPlay, levelRank)`: 获取所有合法出牌选项

逢人配规则：红桃级牌可替代任意非王牌组成牌型。

炸弹分值：王炸(10000) > 级牌炸弹(5000+点数) > 普通炸弹(1000+点数) > 非炸弹(牌型分+最大点数)。

### 3.4 回合逻辑 — `turn.ts`

- `canLead(turnContext)`: 判定领牌权
- `validatePlay(hand, cards, lastPlay, levelRank)`: 出牌合法性
- `resolveRound(turns)`: 解析一轮结果（连续3 Pass → 最后出牌者领牌）
- `checkGameEnd(hands)`: 检测游戏是否结束

### 3.5 进贡逻辑 — `tribute.ts`

- `determineTribute(rankings, hands, levelRank)`: 计算进贡关系
- `canResist(hand)`: 双红大王抗贡判定
- `resolveTribute(tributeCtx)`: 执行进贡还贡流程

### 3.6 状态管理 — `store/game.ts`

Zustand store 串联所有规则函数：

```
actions: deal(), play(cards), pass(), resolveTributeCards()
```

### 3.7 UI 接入

替换 `src/app/room/[roomId]/page.tsx` 中的 mock 数据为真实 store 数据。

## 4. 测试策略

TDD 流程：先写测试 → 测试失败 → 最小实现 → 测试通过 → 重构。

每模块独立测试文件，覆盖率 >= 90%。

## 5. 不做什么

- 不实现 AI（阶段 4）
- 不接入网络/Supabase（阶段 3）
- 不实现动画（阶段 5）
- 不需要真实的用户认证
