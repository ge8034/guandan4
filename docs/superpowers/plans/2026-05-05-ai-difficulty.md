# AI 困难模式炸弹增强 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 AI 跟牌决策中增加拦截判断和不可超越炸弹判断，提升炸弹使用策略。

**Architecture:** 纯函数改动，只修改 `ai.ts` 的 `decideFollow`，新增 2 条决策规则。`aiDecide` 签名新增可选的 `context` 参数保持向后兼容。调用方 `page.tsx` 传入对手手牌数和座位号。

**Tech Stack:** TypeScript, Vitest

---

### Task 1: 新增 AIContext 类型 + 更新 decideFollow 签名

**Files:**
- Modify: `src/lib/game/ai.ts:128-143` (aiDecide 签名)
- Modify: `src/lib/game/ai.ts:268-273` (decideFollow 签名)

- [ ] **Step 1: 在 ai.ts 顶部新增 AIContext 接口**

在 `type AIDecision` 后面添加（约第 13 行之后）：

```typescript
/** AI 决策上下文（困难模式附加信息） */
export interface AIContext {
  mySeat: number;
  opponentHandSizes: number[];
}
```

- [ ] **Step 2: 更新 aiDecide 签名**

将第 129-133 行的函数签名改为：

```typescript
export function aiDecide(
  hand: Card[],
  lastPlay: ClassifiedHand | null,
  levelRank: number,
  context?: AIContext,
): AIDecision {
  if (hand.length === 0) return { type: 'pass' };

  const validPlays = getValidPlays(hand, lastPlay, levelRank);
  const analysis = analyzeHand(hand, levelRank);

  if (lastPlay === null) {
    return decideLead(hand, validPlays, analysis);
  }
  return decideFollow(hand, validPlays, analysis, lastPlay, context);
}
```

- [ ] **Step 3: 更新 decideFollow 签名**

将第 268-273 行改为：

```typescript
function decideFollow(
  hand: Card[],
  validPlays: PlayOption[],
  analysis: HandAnalysis,
  lastPlay: ClassifiedHand,
  context?: AIContext,
): AIDecision {
```

- [ ] **Step 4: 验证 TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: PASS（context 参数可选，现有调用无需改动）

- [ ] **Step 5: 运行现有测试确认向后兼容**

Run: `npm test`
Expected: 277 个测试全部通过

- [ ] **Step 6: 提交**

```bash
git add src/lib/game/ai.ts
git commit -m "refactor: aiDecide / decideFollow 新增可选 context 参数"
```

---

### Task 2: 新增拦截判断规则（规则 4）

**Files:**
- Modify: `src/lib/game/ai.ts:297-298` (规则 3 之后插入)

- [ ] **Step 1: 在规则 3 之后插入拦截判断**

在规则 3（`if (hand.length <= 4) return`）之后，规则 5（`if (hand.length <= 8 && analysis.hasRocket)`）之前，插入：

```typescript
  // d) 对手即将获胜 → 拦截
  // 条件：有对手手牌 <= 2 张（随时可能出完）
  if (context) {
    const hasCloseOpponent = context.opponentHandSizes.some(
      (size, i) => i !== context.mySeat && size > 0 && size <= 2,
    );
    if (hasCloseOpponent) return { type: 'play', cards: minBomb.cards };
  }
```

**注意**：原规则 d（手牌 ≤ 6 → 用炸弹）变为规则 e，其上方注释编号需同步更新。

- [ ] **Step 2: 运行全部测试**

Run: `npm test`
Expected: 277 个测试全部通过（向后兼容，context 可选时规则不触发）

- [ ] **Step 3: 提交**

```bash
git add src/lib/game/ai.ts
git commit -m "feat: AI 困难模式 — 拦截判断（对手剩≤2张时必炸）"
```

---

### Task 3: 新增不可超越炸弹判断规则（规则 6）

**Files:**
- Modify: `src/lib/game/ai.ts` (规则 5 之后插入)

- [ ] **Step 1: 在规则 5 之后插入不可超越炸弹判断**

在规则 5（`if (hand.length <= 8 && analysis.hasRocket)`）之后，规则 c（手牌 ≤ 2 组牌型）之前，插入：

```typescript
  // e) 我方炸弹不可超越（火箭或 7+ 张炸弹）且手牌 ≤ 10 → 降低门槛出手
  if (hand.length <= 10) {
    const hasUnbeatableBomb = bombPlays.some(
      (p) =>
        p.classified.type === 'rocket' ||
        (p.classified.type === 'bomb' && p.cards.length >= 7),
    );
    if (hasUnbeatableBomb) return { type: 'play', cards: minBomb.cards };
  }
```

**注意**：插入位置在规则 5 之后、规则 c（手牌 ≤ 2 组牌型）之前。规则 c 和 d 的注释编号不需要改，因为新规则插入在它们之前。

- [ ] **Step 2: 运行全部测试**

Run: `npm test`
Expected: 277 个测试全部通过

- [ ] **Step 3: 提交**

```bash
git add src/lib/game/ai.ts
git commit -m "feat: AI 困难模式 — 不可超越炸弹判断（火箭/7+张炸弹≤10张时出手）"
```

---

### Task 4: page.tsx 传入 context

**Files:**
- Modify: `src/app/room/[roomId]/page.tsx:165`

- [ ] **Step 1: 修改 aiDecide 调用处**

将第 165 行：

```typescript
const decision = aiDecide(aiHand, lastPlayClassified, state.levelRank);
```

改为：

```typescript
const decision = aiDecide(aiHand, lastPlayClassified, state.levelRank, {
  mySeat: seat,
  opponentHandSizes: state.hands.map((h) => h.length),
});
```

- [ ] **Step 2: 运行 TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: 提交**

```bash
git add src/app/room/[roomId]/page.tsx
git commit -m "feat: page.tsx 向 AI 传入对手手牌数上下文"
```

---

### Task 5: 编写测试 —— 拦截判断（规则 4）

**Files:**
- Modify: `src/lib/game/ai.test.ts`

- [ ] **Step 1: 在 ai.test.ts 末尾 `});` 前添加测试代码块**

```typescript
describe('decideFollow 困难模式 — 拦截判断', () => {
  const levelRank = 2;

  it('对手剩 1 张 → 非炸弹管不上 → 出炸弹拦截', () => {
    const hand: Card[] = [
      c(S, 5), c(H, 5), c(C, 5), c(D, 5), // 炸弹
      c(S, 3), c(S, 4), c(S, 6), c(S, 7),
      c(S, 8),
    ];
    const lastPlay = classifyHand([c(S, 14)], levelRank)!;
    const result = aiDecide(hand, lastPlay, levelRank, {
      mySeat: 0,
      opponentHandSizes: [9, 1, 5, 5], // seat 1 仅剩 1 张
    });
    expect(result.type).toBe('play');
    if (result.type === 'play') {
      expect(result.cards.length).toBeGreaterThanOrEqual(4);
      expect(classifyHand(result.cards, levelRank)!.type).toBe('bomb');
    }
  });

  it('对手剩 2 张 → 非炸弹管不上 → 出炸弹拦截', () => {
    const hand: Card[] = [
      c(S, 5), c(H, 5), c(C, 5), c(D, 5),
      c(S, 3), c(S, 4),
    ];
    const lastPlay = classifyHand([c(S, 14)], levelRank)!;
    const result = aiDecide(hand, lastPlay, levelRank, {
      mySeat: 0,
      opponentHandSizes: [6, 2, 3, 3], // seat 1 剩 2 张
    });
    expect(result.type).toBe('play');
    if (result.type === 'play') {
      expect(classifyHand(result.cards, levelRank)!.type).toBe('bomb');
    }
  });

  it('对手剩 2 张但非炸弹能管上 → 走规则 1 不出炸弹', () => {
    const hand: Card[] = [
      c(S, 5), c(H, 5), c(C, 5), c(D, 5),
      c(S, 14), // 有 A 可以管
    ];
    const lastPlay = classifyHand([c(S, 3)], levelRank)!;
    const result = aiDecide(hand, lastPlay, levelRank, {
      mySeat: 0,
      opponentHandSizes: [6, 2, 3, 3],
    });
    expect(result.type).toBe('play');
    if (result.type === 'play') {
      // 应该用非炸弹管上（单张 A），不是炸弹
      expect(result.cards.length).toBeLessThan(4);
    }
  });

  it('自己剩 2 张不算对手 → 正常决策', () => {
    const hand: Card[] = [
      c(S, 5), c(H, 5), c(C, 5), c(D, 5),
      c(S, 3), c(S, 4),
    ];
    const lastPlay = classifyHand([c(S, 14)], levelRank)!;
    const result = aiDecide(hand, lastPlay, levelRank, {
      mySeat: 2,
      opponentHandSizes: [5, 5, 6, 2], // seat 3 剩 2 张，不是自己
    });
    expect(result.type).toBe('play');
    if (result.type === 'play') {
      expect(classifyHand(result.cards, levelRank)!.type).toBe('bomb');
    }
  });
});
```

- [ ] **Step 2: 运行新测试确认通过**

Run: `npx vitest run src/lib/game/ai.test.ts`
Expected: 所有测试通过（含 4 个新测试）

- [ ] **Step 3: 提交**

```bash
git add src/lib/game/ai.test.ts
git commit -m "test: 困难模式拦截判断测试（4 个用例）"
```

---

### Task 6: 编写测试 —— 不可超越炸弹判断（规则 6）

**Files:**
- Modify: `src/lib/game/ai.test.ts`

- [ ] **Step 1: 在 ai.test.ts 末尾添加测试代码块**

```typescript
describe('decideFollow 困难模式 — 不可超越炸弹', () => {
  const levelRank = 2;

  it('手牌 9 张有火箭 → 非炸弹管不上 → 出火箭', () => {
    const hand: Card[] = [
      c(S, 3), c(S, 4), c(S, 6), c(S, 7), c(S, 8),
      c('joker', 200), c('joker', 200),
      c('joker', 100), c('joker', 100),
    ];
    const lastPlay = classifyHand([c(S, 14)], levelRank)!;
    const result = aiDecide(hand, lastPlay, levelRank, {
      mySeat: 0,
      opponentHandSizes: [9, 5, 3, 4],
    });
    expect(result.type).toBe('play');
    if (result.type === 'play') {
      expect(classifyHand(result.cards, levelRank)!.type).toBe('rocket');
    }
  });

  it('手牌 10 张有 7 张炸弹 → 出炸弹', () => {
    const hand: Card[] = [
      c(S, 3), c(H, 3), c(C, 3), c(D, 3),
      c(S, 3), c(H, 3), c(C, 3), // 7 张 3 = 大炸弹
      c(S, 5), c(S, 6), c(S, 8),
    ];
    const lastPlay = classifyHand([c(S, 14)], levelRank)!;
    const result = aiDecide(hand, lastPlay, levelRank, {
      mySeat: 0,
      opponentHandSizes: [10, 5, 3, 4],
    });
    expect(result.type).toBe('play');
    if (result.type === 'play') {
      expect(result.cards.length).toBeGreaterThanOrEqual(7);
    }
  });

  it('手牌 11 张有火箭 → 超出手牌阈值不触发', () => {
    const hand: Card[] = [
      c(S, 3), c(S, 4), c(S, 6), c(S, 7), c(S, 8),
      c(S, 9), c(S, 10),
      c('joker', 200), c('joker', 200),
      c('joker', 100), c('joker', 100),
    ];
    const lastPlay = classifyHand([c(S, 14)], levelRank)!;
    const result = aiDecide(hand, lastPlay, levelRank, {
      mySeat: 0,
      opponentHandSizes: [11, 5, 3, 4],
    });
    expect(result.type).toBe('pass');
  });

  it('手牌 8 张只有 4 张炸弹无火箭 → 不满足不可超越条件 → 手牌>6且>2组 → 过牌', () => {
    const hand: Card[] = [
      c(S, 5), c(H, 5), c(C, 5), c(D, 5),
      c(S, 3), c(S, 4), c(S, 6), c(S, 7),
    ];
    const lastPlay = classifyHand([c(S, 14)], levelRank)!;
    const result = aiDecide(hand, lastPlay, levelRank, {
      mySeat: 0,
      opponentHandSizes: [8, 5, 5, 5],
    });
    expect(result.type).toBe('pass');
  });
});
```

- [ ] **Step 2: 运行新测试**

Run: `npx vitest run src/lib/game/ai.test.ts`
Expected: 所有测试通过（含 4 个新测试）

- [ ] **Step 3: 提交**

```bash
git add src/lib/game/ai.test.ts
git commit -m "test: 困难模式不可超越炸弹判断测试（4 个用例）"
```

---

### Task 7: 向后兼容 + 覆盖率验证

**Files:**
- Modify: `src/lib/game/ai.test.ts`

- [ ] **Step 1: 追加 context 为 undefined 的兼容测试**

在 ai.test.ts 末尾添加：

```typescript
describe('decideFollow context 可选兼容', () => {
  const levelRank = 2;

  it('context 为 undefined → 不触发新规则，行为与原来一致', () => {
    const hand: Card[] = [
      c(S, 5), c(H, 5), c(C, 5), c(D, 5),
      c(S, 3), c(S, 4), c(S, 6), c(S, 7),
      c(S, 8),
    ];
    const lastPlay = classifyHand([c(S, 14)], levelRank)!;
    // 不传 context —— 虽然对手剩 2 张，但因为没有 context，不触发拦截
    const result = aiDecide(hand, lastPlay, levelRank);
    // 手牌 9 张、groups > 2、无火箭 → 原来行为是过牌
    expect(result.type).toBe('pass');
  });
});
```

- [ ] **Step 2: 运行全部测试覆盖**

Run: `npm test -- --coverage`
Expected: 所有测试通过，分支覆盖率 ≥ 85%

- [ ] **Step 3: 提交**

```bash
git add src/lib/game/ai.test.ts
git commit -m "test: context 为 undefined 的向后兼容测试"
```

---

### 最终验证清单

- [ ] `npm test` — 全部测试通过（预计 ~286 个）
- [ ] `npm test -- --coverage` — 分支 ≥ 85%，语句 ≥ 90%
- [ ] `npx tsc --noEmit` — 无类型错误
- [ ] `npm run dev` — 可正常启动，1v3 AI 对局正常运行

---

### 改动总结

| 文件 | 新增行 | 修改行 | 说明 |
|------|--------|--------|------|
| `src/lib/game/ai.ts` | ~12 | ~8 | AIContext 类型 + 2 条新规则 + 签名变更 |
| `src/app/room/[roomId]/page.tsx` | ~3 | ~1 | 传入 context |
| `src/lib/game/ai.test.ts` | ~120 | 0 | 9 个新测试用例 |
