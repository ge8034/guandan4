# AI 困难模式设计规格

> 日期: 2026-05-05 | 状态: 已批准

## 1. 目标

在现有 AI 决策基础上增强炸弹使用策略，实现"困难"难度的跟牌决策。领牌策略保持不变。

## 2. 架构

```
aiDecide(hand, lastPlay, levelRank, context?)
  ├── getValidPlays()          // 不变
  ├── analyzeHand()            // 不变
  ├── decideLead()             // 不变
  └── decideFollow()           // ← 唯一改动点，新增 2 条规则
```

调用方改动：`page.tsx` 传入 `context` 参数（对手手牌数 + 当前座位号）。

## 3. 新增类型

```typescript
// ai.ts
interface AIContext {
  mySeat: number;              // AI 自己的座位号
  opponentHandSizes: number[]; // 4 家手牌数，已出完为 0
}
```

`aiDecide` 签名变更：

```typescript
// 之前
export function aiDecide(hand: Card[], lastPlay: ClassifiedHand | null, levelRank: number): AIDecision

// 之后
export function aiDecide(hand: Card[], lastPlay: ClassifiedHand | null, levelRank: number, context?: AIContext): AIDecision
```

`context` 可选以保持向后兼容（测试无需改动）。

## 4. 决策链

`decideFollow` 新的完整决策链（按优先级）：

| # | 条件 | 动作 | 状态 |
|---|------|------|------|
| 1 | 非炸弹能管上 | 选分值最低的非炸弹 | 不变 |
| 2 | 无炸弹可用 | 过牌 | 不变 |
| 3 | 手牌 ≤ 4 | 出最小炸弹清场 | 不变 |
| 4 | **对手即将获胜**（手牌 ≤ 2 + 无法用非炸弹管上）| 出最小炸弹拦截 | **新增** |
| 5 | 手牌 ≤ 8 且有火箭 | 出火箭 | 不变 |
| 6 | **我方炸弹不可超越**（火箭或 7+ 张炸弹）且手牌 ≤ 10 | 出最小炸弹 | **新增** |
| 7 | 手牌 ≤ 2 组牌型 | 出最小炸弹加速 | 不变 |
| 8 | 手牌 ≤ 6 | 出最小炸弹 | 不变 |
| 9 | 其他 | 过牌 | 不变 |

## 5. 新规则详细逻辑

### 5.1 规则 4 — 拦截判断

```
条件：
  1. context 存在
  2. 存在对手 i（i !== mySeat）满足 0 < opponentHandSizes[i] <= 2
  3. 当前无法用非炸弹管上（已满足，因为走到规则 4 说明非炸弹全管不上）

动作：出 bombPlays 中分值最小的炸弹
```

### 5.2 规则 6 — 不可超越炸弹判断

```
条件：
  1. 当前无法用非炸弹管上（已满足）
  2. bombPlays 中存在满足以下条件的炸弹：
     a. 火箭（type === 'rocket'），或
     b. 7+ 张牌炸弹（cards.length >= 7）
  3. 手牌总数 <= 10

动作：出 bombPlays 中分值最小的炸弹

原理：
  - 火箭不可被任何牌管上 → 绝对安全
  - 7+ 张炸弹（每种点数最多 8 张，7 张几乎不可超越）→ 近似安全
  - 手牌 ≤ 10 意味着处于残局，大幅降低炸弹积压风险
```

## 6. 函数签名

```typescript
function decideFollow(
  hand: Card[],
  validPlays: PlayOption[],
  analysis: HandAnalysis,
  lastPlay: ClassifiedHand,
  context?: AIContext,  // 新增
): AIDecision
```

## 7. 调用方改动

`src/app/room/[roomId]/page.tsx` 第 165 行：

```typescript
// 之前
const decision = aiDecide(aiHand, lastPlayClassified, state.levelRank);

// 之后
const decision = aiDecide(aiHand, lastPlayClassified, state.levelRank, {
  mySeat: seat,
  opponentHandSizes: state.hands.map((h) => h.length),
});
```

## 8. 文件改动清单

| 文件 | 改动量 | 说明 |
|------|--------|------|
| `src/lib/game/ai.ts` | ~30 行 | 新增 `AIContext` 类型，`decideFollow` 加 2 条规则，`aiDecide` 签名加 context |
| `src/app/room/[roomId]/page.tsx` | ~5 行 | 传入 context |
| `src/lib/game/ai.test.ts` | ~10 个用例 | 拦截测试 + 不可超越炸弹测试 + context 为 undefined 兼容测试 |

## 9. 不变的部分

- `getValidPlays` — 枚举逻辑不变
- `analyzeHand` — 手牌分析不变
- `decideLead` — 领牌策略不变
- `canPass` / `validatePlay` / `classifyHand` — 规则层不变
- Store、组件、样式 — 零改动

## 10. 测试策略

### 新测试用例

1. 拦截：对手 1 家剩 1 张 → 非炸弹管不上 → 出炸弹
2. 拦截：对手 1 家剩 2 张 → 非炸弹管不上 → 出炸弹
3. 拦截：context 为 undefined → 不影响现有逻辑
4. 不可超越：手牌 9 张有火箭 → 非炸弹管不上 → 出火箭
5. 不可超越：手牌 10 张有 7 张炸弹 → 出炸弹
6. 不可超越：手牌 11 张有火箭 → 超过阈值 → 不触发（回归规则 8）
7. 无对手快赢、无可超越炸弹 → 与当前行为一致
8. 对手剩 2 张但非炸弹能管上 → 走规则 1，不出炸弹

### 现有测试兼容性

context 参数可选，所有现有测试无需修改，继续保持通过。
