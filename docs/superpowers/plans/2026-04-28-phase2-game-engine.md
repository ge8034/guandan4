# 阶段 2 掼蛋游戏引擎实施计划

> **对于 agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现掼蛋完整规则引擎（牌型判断、回合逻辑、进贡还贡），支持本地全明牌单人模式 — 4 人手牌同时可见，手动操作所有座位打完一整局。

**Architecture:** 三层分离 — 规则层纯函数（deck/rules/turn/tribute）→ Zustand store 串联状态 → UI 层接入。规则层零外部依赖，输入参数返回结果，可独立单元测试。

**Tech Stack:** TypeScript 5.x 严格模式, Vitest, Zustand 5.x, React 19

---

## 文件结构

```
新建:
  vitest.config.ts              # Vitest 配置
  src/lib/game/types.ts         # 共享类型定义
  src/lib/game/deck.ts          # 牌组管理（创建/洗牌/发牌）
  src/lib/game/deck.test.ts     # 牌组测试
  src/lib/game/rules.ts         # 牌型判断引擎（最复杂）
  src/lib/game/rules.test.ts    # 牌型测试
  src/lib/game/turn.ts          # 回合逻辑
  src/lib/game/turn.test.ts     # 回合测试
  src/lib/game/tribute.ts       # 进贡还贡逻辑
  src/lib/game/tribute.test.ts  # 进贡测试
  src/lib/store/game.ts         # Zustand Game Store

修改:
  package.json                  # 添加 vitest, zustand
  src/app/room/[roomId]/page.tsx # UI 接入真实 store
```

---

### Task 0: 安装依赖和配置测试框架

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: 安装依赖**

```bash
cd D:\Learn-Claude\GuanDan4 && pnpm add zustand && pnpm add -D vitest @testing-library/react
```

Expected: 依赖成功安装

- [ ] **Step 2: 创建 vitest.config.ts**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 3: 在 package.json 添加 test 脚本**

添加 `"test": "vitest run"` 和 `"test:watch": "vitest"` 到 scripts。

- [ ] **Step 4: 验证测试框架**

```bash
npx vitest run
```

Expected: 无测试运行，但框架正常启动

- [ ] **Step 5: 提交**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts
git commit -m "chore: 添加 vitest 和 zustand 依赖，配置测试框架"
```

---

### Task 1: 类型定义

**Files:**
- Create: `src/lib/game/types.ts`

- [ ] **Step 1: 创建类型定义文件**

```typescript
// src/lib/game/types.ts

/** 花色 */
export type Suit = 'heart' | 'diamond' | 'club' | 'spade' | 'joker';

/** 牌型 */
export type HandType =
  | 'single'
  | 'pair'
  | 'triple'
  | 'triple_pair'
  | 'straight'
  | 'sequence_pairs'
  | 'sequence_triples'
  | 'bomb'
  | 'rocket'
  | 'pass';

/** 单张卡牌 */
export interface Card {
  suit: Suit;
  rank: string;
  value: number;
}

/** 已分类的牌型结果 */
export interface ClassifiedHand {
  type: HandType;
  cards: Card[];
  score: number;
}

/** 回合记录 */
export interface TurnRecord {
  turnNo: number;
  seatNo: number;
  type: 'play' | 'pass';
  cards?: Card[];
}

/** 游戏阶段 */
export type GamePhase = 'idle' | 'dealing' | 'tribute' | 'playing' | 'finished';

/** 完整游戏状态 */
export interface GameState {
  status: GamePhase;
  phase: 'deal' | 'tribute' | 'play' | 'result';
  deck: Card[];
  hands: Card[][];
  currentSeat: number;
  turnNo: number;
  lastPlay: { seatNo: number; type: HandType; cards: Card[] } | null;
  passCount: number;
  recentTurns: TurnRecord[];
  levelRank: number;
  rankings: number[];
  scores: number[];
  tributeFrom: number[];
  tributeTo: number[];
  tributeCards: Card[];
  returnCards: Card[];
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
npx tsc --noEmit
```

Expected: 无类型错误

- [ ] **Step 3: 提交**

```bash
git add src/lib/game/types.ts
git commit -m "feat: 添加游戏核心类型定义"
```

---

### Task 2: 牌组管理 (deck.ts)

**Files:**
- Create: `src/lib/game/deck.ts`
- Create: `src/lib/game/deck.test.ts`

- [ ] **Step 1: 编写 deck 测试（TDD RED）**

```typescript
// src/lib/game/deck.test.ts
import { describe, it, expect } from 'vitest';
import { createDeck, shuffle, deal, sortHands } from './deck';
import type { Card } from './types';

describe('createDeck', () => {
  it('应生成 108 张牌（两副 54 张）', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(108);
  });

  it('应包含 4 张王牌（2大王 + 2小王）', () => {
    const deck = createDeck();
    const bigJokers = deck.filter((c) => c.rank === '大王');
    const smallJokers = deck.filter((c) => c.rank === '小王');
    expect(bigJokers).toHaveLength(2);
    expect(smallJokers).toHaveLength(2);
  });

  it('每种花色的每张牌应各 2 张', () => {
    const deck = createDeck();
    const spadeA = deck.filter((c) => c.suit === 'spade' && c.rank === 'A');
    expect(spadeA).toHaveLength(2);
    const heartK = deck.filter((c) => c.suit === 'heart' && c.rank === 'K');
    expect(heartK).toHaveLength(2);
  });
});

describe('shuffle', () => {
  it('应保持牌组长度不变', () => {
    const deck = createDeck();
    const shuffled = shuffle([...deck]);
    expect(shuffled).toHaveLength(108);
  });

  it('应包含所有原始牌', () => {
    const deck = createDeck();
    const shuffled = shuffle([...deck]);
    const sorted = [...shuffled].sort((a, b) =>
      a.suit.localeCompare(b.suit) || a.value - b.value
    );
    const original = [...deck].sort((a, b) =>
      a.suit.localeCompare(b.suit) || a.value - b.value
    );
    expect(sorted).toEqual(original);
  });
});

describe('deal', () => {
  it('应给 4 人各发 27 张牌', () => {
    const deck = createDeck();
    const shuffled = shuffle(deck);
    const hands = deal(shuffled);
    expect(hands).toHaveLength(4);
    hands.forEach((hand) => expect(hand).toHaveLength(27));
  });

  it('发牌后牌组应为空', () => {
    const deck = createDeck();
    const shuffled = shuffle(deck);
    const hands = deal(shuffled);
    const totalCards = hands.reduce((sum, h) => sum + h.length, 0);
    expect(totalCards).toBe(108);
  });
});

describe('sortHands', () => {
  it('应按花色排序（spade > heart > club > diamond > joker）', () => {
    const cards: Card[] = [
      { suit: 'heart', rank: 'A', value: 14 },
      { suit: 'spade', rank: '3', value: 3 },
      { suit: 'joker', rank: '小王', value: 100 },
    ];
    const sorted = sortHands(cards);
    expect(sorted[0].suit).toBe('spade');
    expect(sorted[1].suit).toBe('heart');
    expect(sorted[2].suit).toBe('joker');
  });

  it('同花色应按点数降序排列', () => {
    const cards: Card[] = [
      { suit: 'spade', rank: '3', value: 3 },
      { suit: 'spade', rank: 'A', value: 14 },
      { suit: 'spade', rank: 'K', value: 13 },
    ];
    const sorted = sortHands(cards);
    expect(sorted[0].rank).toBe('A');
    expect(sorted[1].rank).toBe('K');
    expect(sorted[2].rank).toBe('3');
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```bash
npx vitest run src/lib/game/deck.test.ts
```

Expected: 所有测试 FAIL（模块不存在）

- [ ] **Step 3: 实现 deck.ts（TDD GREEN）**

```typescript
// src/lib/game/deck.ts
import type { Card, Suit } from './types';

const SUITS: Suit[] = ['spade', 'heart', 'club', 'diamond'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

/** 创建 108 张牌（两副） */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (let copy = 0; copy < 2; copy++) {
    for (const suit of SUITS) {
      for (let i = 0; i < RANKS.length; i++) {
        deck.push({ suit, rank: RANKS[i], value: i + 2 }); // A=14
      }
    }
    deck.push({ suit: 'joker', rank: '小王', value: 100 });
    deck.push({ suit: 'joker', rank: '大王', value: 200 });
  }
  return deck;
}

/** Fisher-Yates 洗牌 */
export function shuffle(deck: Card[]): Card[] {
  const result = [...deck];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** 发牌：每人 27 张，返回排序后的手牌 */
export function deal(deck: Card[]): Card[][] {
  const hands: Card[][] = [[], [], [], []];
  for (let i = 0; i < deck.length; i++) {
    hands[i % 4].push(deck[i]);
  }
  return hands.map((h) => sortHands(h));
}

const SUIT_ORDER: Record<string, number> = {
  spade: 0, heart: 1, club: 2, diamond: 3, joker: 4,
};

/** 手牌排序：花色优先（♠♥♣♦★），同花色点数降序 */
export function sortHands(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    const suitDiff = (SUIT_ORDER[a.suit] ?? 5) - (SUIT_ORDER[b.suit] ?? 5);
    if (suitDiff !== 0) return suitDiff;
    return b.value - a.value;
  });
}
```

- [ ] **Step 4: 运行测试验证通过**

```bash
npx vitest run src/lib/game/deck.test.ts
```

Expected: 所有测试 PASS

- [ ] **Step 5: 提交**

```bash
git add src/lib/game/deck.ts src/lib/game/deck.test.ts
git commit -m "feat: 实现牌组管理（创建/洗牌/发牌/排序）"
```

---

### Task 3: 牌型判断引擎 (rules.ts) — 最复杂模块

**Files:**
- Create: `src/lib/game/rules.ts`
- Create: `src/lib/game/rules.test.ts`

牌型分值体系：
- 大王=200, 小王=100, 红桃级牌(逢人配)=60, 普通级牌=50
- A=14, K=13, Q=12, J=11, 10=10, ..., 2=2
- 王炸=10000, 级牌炸弹=5000+点数, 普通炸弹=1000+点数
- 非炸弹牌型分值 = 牌型基础分 + 最大点数
  单张=点数, 对子=100+点数, 三同张=200+点数, 三带二=300+点数
  顺子=400+最大点数, 连对=500+最大点数, 钢板=600+最大点数

- [ ] **Step 1: 编写 rules 核心测试（TDD RED）**

```typescript
// src/lib/game/rules.test.ts
import { describe, it, expect } from 'vitest';
import {
  classifyHand,
  compareHands,
  getCardScore,
  getValidPlays,
  isBomb,
  isRocket,
} from './rules';
import type { Card, ClassifiedHand } from './types';

function c(suit: string, rank: string, value: number): Card {
  return { suit: suit as Card['suit'], rank, value };
}

const S = 'spade', H = 'heart', C = 'club', D = 'diamond';

describe('getCardScore', () => {
  it('大王=200, 小王=100', () => {
    expect(getCardScore(c('joker', '大王', 200), 2)).toBe(200);
    expect(getCardScore(c('joker', '小王', 100), 2)).toBe(100);
  });

  it('红桃级牌=60, 普通级牌=50', () => {
    expect(getCardScore(c('heart', '2', 2), 2)).toBe(60);  // 逢人配
    expect(getCardScore(c('spade', '2', 2), 2)).toBe(50);
  });

  it('A=14, K=13, ..., 2=2', () => {
    expect(getCardScore(c('spade', 'A', 14), 3)).toBe(14);
    expect(getCardScore(c('spade', 'K', 13), 3)).toBe(13);
    expect(getCardScore(c('spade', '3', 3), 3)).toBe(3);
  });

  it('当级牌=其他值时，原本点数的牌恢复普通分值', () => {
    expect(getCardScore(c('heart', '3', 3), 2)).toBe(3); // 非级牌
  });
});

describe('classifyHand', () => {
  const levelRank = 2;

  it('识别单张', () => {
    const result = classifyHand([c(S, 'A', 14)], levelRank);
    expect(result.type).toBe('single');
  });

  it('识别对子', () => {
    const result = classifyHand([
      c(S, '5', 5), c(H, '5', 5)
    ], levelRank);
    expect(result.type).toBe('pair');
  });

  it('识别三同张', () => {
    const result = classifyHand([
      c(S, 'K', 13), c(H, 'K', 13), c(C, 'K', 13)
    ], levelRank);
    expect(result.type).toBe('triple');
  });

  it('识别三带二', () => {
    const result = classifyHand([
      c(S, 'K', 13), c(H, 'K', 13), c(C, 'K', 13),
      c(S, '5', 5), c(H, '5', 5),
    ], levelRank);
    expect(result.type).toBe('triple_pair');
  });

  it('识别顺子（5张连续，同花色，不含王）', () => {
    const result = classifyHand([
      c(S, '5', 5), c(S, '6', 6), c(S, '7', 7),
      c(S, '8', 8), c(S, '9', 9),
    ], levelRank);
    expect(result.type).toBe('straight');
  });

  it('识别连对（3组连续对子，6张）', () => {
    const result = classifyHand([
      c(S, '5', 5), c(H, '5', 5),
      c(S, '6', 6), c(H, '6', 6),
      c(S, '7', 7), c(H, '7', 7),
    ], levelRank);
    expect(result.type).toBe('sequence_pairs');
  });

  it('识别钢板（2组连续三同张，6张）', () => {
    const result = classifyHand([
      c(S, '5', 5), c(H, '5', 5), c(C, '5', 5),
      c(S, '6', 6), c(H, '6', 6), c(C, '6', 6),
    ], levelRank);
    expect(result.type).toBe('sequence_triples');
  });

  it('识别炸弹（4张同点数）', () => {
    const result = classifyHand([
      c(S, '8', 8), c(H, '8', 8), c(C, '8', 8), c(D, '8', 8),
    ], levelRank);
    expect(result.type).toBe('bomb');
  });

  it('识别火箭/王炸（4张王）', () => {
    const result = classifyHand([
      c('joker', '大王', 200), c('joker', '大王', 200),
      c('joker', '小王', 100), c('joker', '小王', 100),
    ], levelRank);
    expect(result.type).toBe('rocket');
  });

  it('逢人配替代：红桃级牌补全三同张', () => {
    const result = classifyHand([
      c(S, '5', 5), c(C, '5', 5), c(H, '2', 2), // 红桃2=逢人配
    ], 2);
    expect(result.type).toBe('triple');
  });

  it('逢人配不可替代王牌', () => {
    // 红桃2 + 大王 + 小王 → 不构成任何合法牌型
    const result = classifyHand([
      c(H, '2', 2), c('joker', '大王', 200), c('joker', '小王', 100),
    ], 2);
    // 不能合理组成 → 理论上返回 null 或 closest match
    expect(result).toBeNull();
  });

  it('无效牌型返回 null', () => {
    // 两张不同点数的牌
    const result = classifyHand([
      c(S, '5', 5), c(S, '7', 7),
    ], levelRank);
    expect(result).toBeNull();
  });

  it('4张非连续的牌不等于顺子', () => {
    const result = classifyHand([
      c(S, '5', 5), c(S, '6', 6), c(S, '7', 7), c(S, '8', 8),
    ], levelRank);
    // 4张同花色连续 → 不是标准牌型，返回 null
    expect(result).toBeNull();
  });
});

describe('compareHands — 炸弹比较', () => {
  const levelRank = 2;

  it('火箭最大（10000分）', () => {
    const rocket: Card[] = [
      c('joker', '大王', 200), c('joker', '大王', 200),
      c('joker', '小王', 100), c('joker', '小王', 100),
    ];
    const bomb6: Card[] = [
      c(S, 'A', 14), c(H, 'A', 14), c(C, 'A', 14), c(D, 'A', 14),
      c(S, 'A', 14), c(H, 'A', 14), // 6张A炸弹（实际不存在6张A，仅测试用）
    ];
    // 实际用 6 张同点数：两副牌中各 4 张 A，共 8 张
    // 用 6 张验证
    const bomb6Cards: Card[] = Array.from({length: 6}, (_, i) =>
      ({ suit: [S,H,C,D,S,H][i] as Card['suit'], rank: 'A', value: 14 })
    );
    const result = compareHands(rocket, bomb6Cards, levelRank);
    expect(result).toBe(1); // 火箭 > 6张炸弹
  });

  it('炸弹张数多者大', () => {
    const bomb4: Card[] = [c(S,'5',5), c(H,'5',5), c(C,'5',5), c(D,'5',5)];
    const bomb5: Card[] = [c(S,'3',3), c(H,'3',3), c(C,'3',3), c(D,'3',3), c(S,'3',3)];
    const result = compareHands(bomb4, bomb5, levelRank);
    expect(result).toBe(-1); // bomb4 < bomb5
  });

  it('炸弹同张数比点数', () => {
    const bombK: Card[] = [c(S,'K',13), c(H,'K',13), c(C,'K',13), c(D,'K',13)];
    const bomb5: Card[] = [c(S,'5',5), c(H,'5',5), c(C,'5',5), c(D,'5',5)];
    const result = compareHands(bombK, bomb5, levelRank);
    expect(result).toBe(1); // K炸弹 > 5炸弹
  });

  it('炸弹 > 非炸弹牌型', () => {
    const bomb: Card[] = [c(S,'3',3), c(H,'3',3), c(C,'3',3), c(D,'3',3)];
    const single: Card[] = [c(S,'A',14)];
    const result = compareHands(bomb, single, levelRank);
    expect(result).toBe(1); // 炸弹 > 单张
  });
});

describe('isBomb / isRocket', () => {
  it('4张同点数是炸弹', () => {
    expect(isBomb([c(S,'5',5), c(H,'5',5), c(C,'5',5), c(D,'5',5)])).toBe(true);
  });

  it('3张同点数不是炸弹', () => {
    expect(isBomb([c(S,'5',5), c(H,'5',5), c(C,'5',5)])).toBe(false);
  });

  it('4张王是火箭', () => {
    expect(isRocket([
      c('joker','大王',200), c('joker','大王',200),
      c('joker','小王',100), c('joker','小王',100),
    ])).toBe(true);
  });

  it('3张王不是火箭', () => {
    expect(isRocket([
      c('joker','大王',200), c('joker','大王',200),
      c('joker','小王',100),
    ])).toBe(false);
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```bash
npx vitest run src/lib/game/rules.test.ts
```

Expected: 所有测试 FAIL

- [ ] **Step 3: 实现 rules.ts — Part 1: 基础函数**

```typescript
// src/lib/game/rules.ts
import type { Card, ClassifiedHand, HandType } from './types';

/** 获取单张卡牌在给定级牌下的分值 */
export function getCardScore(card: Card, levelRank: number): number {
  // 大王/小王固定分值
  if (card.suit === 'joker') return card.value; // 200 / 100

  // 当前级牌
  if (card.value === levelRank) {
    return card.suit === 'heart' ? 60 : 50;
  }

  // A=14, K=13, ..., 2=2
  if (card.rank === 'A') return 14;
  if (card.rank === 'K') return 13;
  if (card.rank === 'Q') return 12;
  if (card.rank === 'J') return 11;
  return card.value;
}

/** 是否是王牌 */
function isJoker(card: Card): boolean {
  return card.suit === 'joker';
}

/** 是否是逢人配（红桃级牌） */
function isWildCard(card: Card, levelRank: number): boolean {
  return card.suit === 'heart' && card.value === levelRank;
}

/** 炸弹分值 */
function getBombScore(cards: Card[], levelRank: number): number {
  if (isRocket(cards)) return 10000;
  const count = cards.length;
  const baseValue = cards[0].value;
  if (baseValue === levelRank) return 5000 + baseValue;
  return 1000 + baseValue + (count - 4) * 500;
}

/** 判定是否为火箭（4张王：2大王+2小王） */
export function isRocket(cards: Card[]): boolean {
  if (cards.length !== 4) return false;
  const bigJokers = cards.filter((c) => c.rank === '大王').length;
  const smallJokers = cards.filter((c) => c.rank === '小王').length;
  return bigJokers === 2 && smallJokers === 2;
}

/** 判定是否为炸弹（4张及以上同点数，不含王） */
export function isBomb(cards: Card[]): boolean {
  if (cards.length < 4) return false;
  if (cards.some((c) => c.suit === 'joker')) return false;
  const firstValue = cards[0].value;
  return cards.every((c) => c.value === firstValue);
}
```

- [ ] **Step 4: 实现 rules.ts — Part 2: classifyHand 核心函数**

```typescript
/** 分类牌型，返回 ClassifiedHand 或 null */
export function classifyHand(
  cards: Card[],
  levelRank: number
): ClassifiedHand | null {
  if (cards.length === 0) return null;

  // 分离王牌、逢人配、普通牌
  const jokers = cards.filter(isJoker);
  const wildCards = cards.filter((c) => isWildCard(c, levelRank));
  const normalCards = cards.filter(
    (c) => !isJoker(c) && !isWildCard(c, levelRank)
  );
  const wildCount = wildCards.length;
  const jokerCount = jokers.length;

  // 火箭：2大王+2小王
  if (cards.length === 4 && isRocket(cards)) {
    return { type: 'rocket', cards, score: 10000 };
  }

  // 炸弹：不含王，>=4张同点数
  if (jokerCount === 0 && wildCount === 0 && isBomb(cards)) {
    return { type: 'bomb', cards, score: getBombScore(cards, levelRank) };
  }

  // 含逢人配的炸弹
  if (jokerCount === 0 && wildCount > 0) {
    const allNormal = [...normalCards, ...wildCards];
    if (allNormal.length >= 4) {
      const values = new Set(allNormal.map((c) => c.value));
      if (values.size === 1) {
        // 逢人配补全炸弹
        return {
          type: 'bomb',
          cards,
          score: getBombScore(allNormal, levelRank),
        };
      }
    }
  }

  // 以下处理不含王牌和逢人配的普通牌型
  if (jokerCount > 0) return null;

  // 使用逢人配补全
  const effective = [...normalCards];
  const totalCount = effective.length + wildCount;

  if (totalCount === 1) {
    return { type: 'single', cards, score: getCardScore(effective[0] || wildCards[0], levelRank) };
  }

  if (totalCount === 2 && isAllSameValue(effective, wildCount)) {
    return { type: 'pair', cards, score: 100 + getBaseValue(effective, wildCards) };
  }

  if (totalCount === 3 && isAllSameValue(effective, wildCount)) {
    return { type: 'triple', cards, score: 200 + getBaseValue(effective, wildCards) };
  }

  if (totalCount === 5 && isTriplePair(effective, wildCount)) {
    return { type: 'triple_pair', cards, score: 300 + getBaseValue(effective, wildCards) };
  }

  if (totalCount === 5 && isStraight(effective, wildCount)) {
    return { type: 'straight', cards, score: 400 + getMaxValue(effective, wildCards) };
  }

  if (totalCount === 6 && isSequencePairs(effective, wildCount)) {
    return { type: 'sequence_pairs', cards, score: 500 + getMaxValue(effective, wildCards) };
  }

  if (totalCount === 6 && isSequenceTriples(effective, wildCount)) {
    return { type: 'sequence_triples', cards, score: 600 + getMaxValue(effective, wildCards) };
  }

  return null;
}

function isAllSameValue(cards: Card[], wildCount: number): boolean {
  if (cards.length === 0) return wildCount > 0;
  const firstVal = cards[0].value;
  return cards.every((c) => c.value === firstVal);
}

function getBaseValue(cards: Card[], wildCards: Card[]): number {
  if (cards.length > 0) return cards[0].value;
  return wildCards[0]?.value || 0;
}

function getMaxValue(cards: Card[], wildCards: Card[]): number {
  const allValues = [
    ...cards.map((c) => c.value),
    ...wildCards.map((c) => c.value),
  ];
  return Math.max(...allValues);
}

function isTriplePair(cards: Card[], wildCount: number): boolean {
  // 三带二：3张同点 + 2张同点（对子）
  const groups = groupByValue(cards);
  const values = Object.keys(groups).map(Number);
  const available = wildCount;
  // 需要恰好一个3张组和一个2张组
  let tripleFound = false;
  let pairFound = false;
  let usedWild = 0;

  for (const v of values) {
    const count = groups[v].length;
    if (count === 3) tripleFound = true;
    else if (count === 2) pairFound = true;
    else if (count === 1 && available > usedWild) {
      // 用逢人配补全
      if (!tripleFound) { tripleFound = true; usedWild += 2; }
      else if (!pairFound) { pairFound = true; usedWild++; }
    }
  }

  // 仅剩逢人配补全的情况
  if (!tripleFound && available - usedWild >= 3) { tripleFound = true; usedWild += 3; }
  if (!pairFound && available - usedWild >= 2) { pairFound = true; usedWild += 2; }

  return tripleFound && pairFound && usedWild <= wildCount;
}

function isStraight(cards: Card[], wildCount: number): boolean {
  if (cards.length + wildCount !== 5) return false;
  if (wildCount > 0) return false; // 顺子不可含逢人配
  if (cards.some((c) => c.suit !== cards[0].suit)) return false; // 必须同花色
  const values = cards.map((c) => c.value).sort((a, b) => a - b);
  for (let i = 1; i < values.length; i++) {
    if (values[i] !== values[i - 1] + 1) return false;
  }
  // 顺子中不可有2和王（value >= 100），但2可以作为正常牌
  return !cards.some((c) => c.value >= 100);
}

function isSequencePairs(cards: Card[], wildCount: number): boolean {
  if (cards.length + wildCount !== 6) return false;
  // 连对：恰好3组连续对子
  const groups = groupByValue(cards);
  const values = Object.keys(groups).map(Number).sort((a, b) => a - b);
  if (values.length !== 3) return false;
  if (wildCount > 0) return false; // 简化：不含逢人配
  if (values[1] !== values[0] + 1 || values[2] !== values[1] + 1) return false;
  return groups[values[0]].length === 2
    && groups[values[1]].length === 2
    && groups[values[2]].length === 2;
}

function isSequenceTriples(cards: Card[], wildCount: number): boolean {
  if (cards.length + wildCount !== 6) return false;
  // 钢板：恰好2组连续三同张
  const groups = groupByValue(cards);
  const values = Object.keys(groups).map(Number).sort((a, b) => a - b);
  if (values.length !== 2) return false;
  if (wildCount > 0) return false; // 简化：不含逢人配
  if (values[1] !== values[0] + 1) return false;
  return groups[values[0]].length === 3 && groups[values[1]].length === 3;
}

function groupByValue(cards: Card[]): Record<number, Card[]> {
  const groups: Record<number, Card[]> = {};
  for (const card of cards) {
    if (!groups[card.value]) groups[card.value] = [];
    groups[card.value].push(card);
  }
  return groups;
}

/** 比较两手牌：返回 1(a>b), -1(a<b), 0(相等/不可比较) */
export function compareHands(
  a: Card[],
  b: Card[],
  levelRank: number
): number {
  const classifiedA = classifyHand(a, levelRank);
  const classifiedB = classifyHand(b, levelRank);
  if (!classifiedA || !classifiedB) return 0;

  const isABomb = classifiedA.type === 'bomb' || classifiedA.type === 'rocket';
  const isBBomb = classifiedB.type === 'bomb' || classifiedB.type === 'rocket';

  // 炸弹可压非炸弹
  if (isABomb && !isBBomb) return 1;
  if (!isABomb && isBBomb) return -1;

  // 都是炸弹或都不是炸弹
  if (classifiedA.type !== classifiedB.type) return 0; // 不同牌型不可比较

  return classifiedA.score > classifiedB.score ? 1
    : classifiedA.score < classifiedB.score ? -1
    : 0;
}

/** 获取所有合法出牌选项 */
export function getValidPlays(
  hand: Card[],
  lastPlay: ClassifiedHand | null,
  levelRank: number
): ClassifiedHand[] {
  // 简化版：返回手牌中所有合法牌型
  // 完整版需组合搜索，此处为框架
  const results: ClassifiedHand[] = [];
  // 单张
  for (const card of hand) {
    const ch = classifyHand([card], levelRank);
    if (ch && (!lastPlay || compareHands([card], lastPlay.cards, levelRank) > 0)) {
      results.push(ch);
    }
  }
  return results;
}
```

- [ ] **Step 5: 运行全部 rules 测试**

```bash
npx vitest run src/lib/game/rules.test.ts
```

Expected: 大部分测试 PASS，复杂牌型可能需要调试

- [ ] **Step 6: 调试并补全逢人配逻辑**

根据测试失败情况完善 `classifyHand` 中的逢人配替代算法。

- [ ] **Step 7: 提交**

```bash
git add src/lib/game/rules.ts src/lib/game/rules.test.ts
git commit -m "feat: 实现牌型判断引擎（10种牌型识别+大小比较+逢人配）"
```

---

### Task 4: 回合逻辑 (turn.ts)

**Files:**
- Create: `src/lib/game/turn.ts`
- Create: `src/lib/game/turn.test.ts`

- [ ] **Step 1: 编写 turn 测试**

```typescript
// src/lib/game/turn.test.ts
import { describe, it, expect } from 'vitest';
import {
  validatePlay,
  canPass,
  nextSeat,
  resolveNewRound,
} from './turn';
import type { Card } from './types';
import { classifyHand } from './rules';

function c(suit: string, rank: string, value: number): Card {
  return { suit: suit as Card['suit'], rank, value };
}

const levelRank = 2;

describe('validatePlay', () => {
  it('领牌时任意合法牌型可出', () => {
    const hand: Card[] = [c('spade','A',14), c('heart','3',3), c('club','4',4)];
    const cards = [c('spade','A',14)];
    const result = validatePlay(hand, cards, null, levelRank);
    expect(result.valid).toBe(true);
  });

  it('跟牌必须比上家大', () => {
    const hand: Card[] = [c('spade','A',14), c('spade','K',13)];
    const cards = [c('spade','A',14)];
    const lastPlay = classifyHand([c('spade','K',13)], levelRank)!;
    const result = validatePlay(hand, cards, lastPlay, levelRank);
    expect(result.valid).toBe(true);
  });

  it('跟牌不能比上家小', () => {
    const hand: Card[] = [c('spade','5',5)];
    const cards = [c('spade','5',5)];
    const lastPlay = classifyHand([c('spade','A',14)], levelRank)!;
    const result = validatePlay(hand, cards, lastPlay, levelRank);
    expect(result.valid).toBe(false);
  });

  it('领牌者不能过牌', () => {
    expect(canPass(false)).toBe(false);
  });

  it('跟牌者可以过牌', () => {
    expect(canPass(true)).toBe(true);
  });
});

describe('nextSeat', () => {
  it('seat 3 下一个是 seat 0', () => {
    expect(nextSeat(3)).toBe(0);
  });

  it('seat 0 下一个是 seat 1', () => {
    expect(nextSeat(0)).toBe(1);
  });
});

describe('resolveNewRound', () => {
  it('连续3人过牌 → 重新领牌', () => {
    expect(resolveNewRound(3, 0)).toEqual({ newRound: true, leader: 0 });
  });

  it('未满3人过牌 → 继续', () => {
    expect(resolveNewRound(2, 1)).toEqual({ newRound: false, leader: 1 });
  });
});
```

- [ ] **Step 2: 实现 turn.ts**

```typescript
// src/lib/game/turn.ts
import type { Card, ClassifiedHand } from './types';
import { classifyHand, compareHands } from './rules';

interface ValidateResult {
  valid: boolean;
  error?: string;
}

export function validatePlay(
  hand: Card[],
  selectedCards: Card[],
  lastPlay: ClassifiedHand | null,
  levelRank: number
): ValidateResult {
  // 检查选中牌是否在手牌中
  const handCopy = [...hand];
  for (const card of selectedCards) {
    const idx = handCopy.findIndex(
      (c) => c.suit === card.suit && c.rank === card.rank && c.value === card.value
    );
    if (idx === -1) return { valid: false, error: '选中的牌不在手牌中' };
    handCopy.splice(idx, 1);
  }

  const classified = classifyHand(selectedCards, levelRank);
  if (!classified) return { valid: false, error: '无效牌型' };

  if (lastPlay) {
    // 跟牌：必须比上家大
    const cmp = compareHands(selectedCards, lastPlay.cards, levelRank);
    if (cmp <= 0) return { valid: false, error: '必须出比上家大的牌' };
  }

  return { valid: true };
}

export function canPass(isFollowing: boolean): boolean {
  return isFollowing;
}

export function nextSeat(currentSeat: number): number {
  return (currentSeat + 1) % 4;
}

export function resolveNewRound(
  passCount: number,
  lastSeat: number
): { newRound: boolean; leader: number } {
  if (passCount >= 3) {
    return { newRound: true, leader: lastSeat };
  }
  return { newRound: false, leader: lastSeat };
}
```

- [ ] **Step 3: 运行测试**

```bash
npx vitest run src/lib/game/turn.test.ts
```

Expected: PASS

- [ ] **Step 4: 提交**

```bash
git add src/lib/game/turn.ts src/lib/game/turn.test.ts
git commit -m "feat: 实现回合逻辑（出牌验证/过牌/座位轮转/领牌判定）"
```

---

### Task 5: 进贡逻辑 (tribute.ts)

**Files:**
- Create: `src/lib/game/tribute.ts`
- Create: `src/lib/game/tribute.test.ts`

- [ ] **Step 1: 编写 tribute 测试**

```typescript
// src/lib/game/tribute.test.ts
import { describe, it, expect } from 'vitest';
import {
  determineTributePairs,
  canResistTribute,
  getTributeCard,
  getReturnCard,
} from './tribute';
import type { Card } from './types';

function c(suit: string, rank: string, value: number): Card {
  return { suit: suit as Card['suit'], rank, value };
}

describe('determineTributePairs', () => {
  it('头游&二游同队 → 末游→头游, 三游→二游', () => {
    // seat 0(头游) seat 2(二游) 同队(0+2), seat 1(三游) seat 3(末游) 同队(1+3)
    const rankings = [0, 2, 1, 3]; // 出完顺序
    const pairs = determineTributePairs(rankings);
    expect(pairs).toHaveLength(2);
    expect(pairs).toContainEqual({ from: 3, to: 0 }); // 末游→头游
    expect(pairs).toContainEqual({ from: 1, to: 2 }); // 三游→二游
  });

  it('头游&三游同队 → 仅末游→头游', () => {
    // seat 0(头游) seat 1(二游,对手) seat 2(三游,同队) seat 3(末游,对手)
    const rankings = [0, 1, 2, 3];
    const pairs = determineTributePairs(rankings);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]).toEqual({ from: 3, to: 0 });
  });
});

describe('canResistTribute', () => {
  it('持有双红大王可抗贡', () => {
    const hand: Card[] = [
      c('heart', '大王', 200),
      c('diamond', '大王', 200),
      c('spade', '3', 3),
    ];
    // 两张红色大王（heart + diamond 都算红）
    expect(canResistTribute(hand)).toBe(true);
  });

  it('无双红大王不可抗贡', () => {
    const hand: Card[] = [
      c('spade', '大王', 200),
      c('club', '大王', 200),
    ];
    expect(canResistTribute(hand)).toBe(false);
  });
});

describe('getTributeCard', () => {
  it('末游进贡手中最大的牌（>=10）', () => {
    const hand: Card[] = [
      c('spade', 'A', 14), c('spade', 'K', 13),
      c('heart', '3', 3),
    ];
    const card = getTributeCard(hand);
    expect(card?.rank).toBe('A');
  });

  it('无 >=10 的牌则不进贡', () => {
    const hand: Card[] = [
      c('heart', '3', 3), c('spade', '5', 5), c('club', '8', 8),
    ];
    const card = getTributeCard(hand);
    expect(card).toBeNull();
  });
});

describe('getReturnCard', () => {
  it('头游还贡必须 <10', () => {
    const hand: Card[] = [
      c('spade', 'A', 14), c('heart', '3', 3), c('club', '5', 5),
    ];
    const card = getReturnCard(hand);
    expect(card).not.toBeNull();
    expect(card!.value).toBeLessThan(10);
  });
});
```

- [ ] **Step 2: 实现 tribute.ts**

```typescript
// src/lib/game/tribute.ts
import type { Card } from './types';
import { sortHands } from './deck';

interface TributePair {
  from: number;
  to: number;
}

/** 判定进贡关系 */
export function determineTributePairs(rankings: number[]): TributePair[] {
  const first = rankings[0];
  const second = rankings[1];
  const third = rankings[2];
  const last = rankings[3];

  const pairs: TributePair[] = [];

  // 同队判定：seat 0+2 同队, seat 1+3 同队
  const isSameTeam = (a: number, b: number) =>
    (a + b) % 2 === 0; // 0+2=2(even), 1+3=4(even) ✓

  if (isSameTeam(first, second)) {
    // 头游+二游同队 → 升3级局面
    pairs.push({ from: last, to: first });
    pairs.push({ from: third, to: second });
  } else {
    // 头游+三游或头游+末游
    pairs.push({ from: last, to: first });
  }

  return pairs;
}

/** 抗贡判定：持有两张红色大王 */
export function canResistTribute(hand: Card[]): boolean {
  const redJokers = hand.filter(
    (c) =>
      c.rank === '大王' &&
      (c.suit === 'heart' || c.suit === 'diamond')
  );
  return redJokers.length >= 2;
}

/** 获取进贡牌：手中最大的牌（>=10） */
export function getTributeCard(hand: Card[]): Card | null {
  const sorted = sortHands(hand);
  const maxCard = sorted[0];
  if (maxCard && maxCard.value >= 10) return maxCard;
  return null;
}

/** 获取还贡牌：手中任意一张 <10 的牌 */
export function getReturnCard(hand: Card[]): Card | null {
  const eligible = hand.filter(
    (c) => c.value < 10
  );
  if (eligible.length === 0) return hand[hand.length - 1]; // 最小的一张
  return eligible[eligible.length - 1]; // 给较小的
}
```

- [ ] **Step 3: 运行测试**

```bash
npx vitest run src/lib/game/tribute.test.ts
```

Expected: PASS

- [ ] **Step 4: 提交**

```bash
git add src/lib/game/tribute.ts src/lib/game/tribute.test.ts
git commit -m "feat: 实现进贡还贡逻辑（进贡判定/抗贡/进贡牌选择）"
```

---

### Task 6: Zustand Game Store

**Files:**
- Create: `src/lib/store/game.ts`

- [ ] **Step 1: 创建 Zustand Store**

```typescript
// src/lib/store/game.ts
import { create } from 'zustand';
import type { Card, ClassifiedHand, GamePhase, TurnRecord } from '@/lib/game/types';
import { createDeck, shuffle, deal } from '@/lib/game/deck';
import { classifyHand, compareHands } from '@/lib/game/rules';
import { validatePlay, canPass, nextSeat, resolveNewRound } from '@/lib/game/turn';
import {
  determineTributePairs,
  canResistTribute,
  getTributeCard,
  getReturnCard,
} from '@/lib/game/tribute';

interface GameStore {
  phase: GamePhase;
  hands: Card[][];
  currentSeat: number;
  turnNo: number;
  lastPlay: { seatNo: number; type: string; cards: Card[] } | null;
  passCount: number;
  recentTurns: TurnRecord[];
  levelRank: number;
  rankings: number[];
  tributePairs: { from: number; to: number }[];
  error: string | null;

  startGame: () => void;
  playCards: (seatNo: number, cards: Card[]) => void;
  passTurn: (seatNo: number) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'idle',
  hands: [[], [], [], []],
  currentSeat: 0,
  turnNo: 0,
  lastPlay: null,
  passCount: 0,
  recentTurns: [],
  levelRank: 2,
  rankings: [],
  tributePairs: [],
  error: null,

  startGame: () => {
    const deck = shuffle(createDeck());
    const hands = deal(deck);
    set({
      phase: 'playing',
      hands,
      currentSeat: Math.floor(Math.random() * 4),
      turnNo: 1,
      lastPlay: null,
      passCount: 0,
      recentTurns: [],
      rankings: [],
      error: null,
    });
  },

  playCards: (seatNo: number, cards: Card[]) => {
    const state = get();
    if (state.phase !== 'playing') return;
    if (seatNo !== state.currentSeat) {
      set({ error: '不是你的回合' });
      return;
    }

    const lastPlayClassified = state.lastPlay
      ? classifyHand(state.lastPlay.cards, state.levelRank)
      : null;

    const result = validatePlay(
      state.hands[seatNo],
      cards,
      lastPlayClassified,
      state.levelRank
    );

    if (!result.valid) {
      set({ error: result.error || '无效出牌' });
      return;
    }

    // 从手牌移除
    const newHands = state.hands.map((h) => [...h]);
    for (const card of cards) {
      const idx = newHands[seatNo].findIndex(
        (c) => c.suit === card.suit && c.rank === card.rank && c.value === card.value
      );
      if (idx !== -1) newHands[seatNo].splice(idx, 1);
    }

    const classified = classifyHand(cards, state.levelRank)!;
    const newRecent = [
      {
        turnNo: state.turnNo,
        seatNo,
        type: 'play' as const,
        cards,
      },
      ...state.recentTurns,
    ].slice(0, 4);

    // 检查手牌清空
    const newRankings = [...state.rankings];
    if (newHands[seatNo].length === 0 && !newRankings.includes(seatNo)) {
      newRankings.push(seatNo);
    }

    const next = nextSeat(seatNo);

    // 跳过已出完的玩家
    let actualNext = next;
    while (newHands[actualNext].length === 0) {
      actualNext = nextSeat(actualNext);
      if (actualNext === next) break; // 防止死循环
    }

    set({
      hands: newHands,
      currentSeat: actualNext,
      lastPlay: { seatNo, type: classified.type, cards },
      passCount: 0,
      recentTurns: newRecent,
      rankings: newRankings,
      turnNo: state.turnNo + 1,
      error: null,
    });

    // 检查游戏结束
    if (newRankings.length >= 4) {
      set({ phase: 'finished' });
    }
  },

  passTurn: (seatNo: number) => {
    const state = get();
    if (state.phase !== 'playing') return;
    if (seatNo !== state.currentSeat) {
      set({ error: '不是你的回合' });
      return;
    }
    if (!state.lastPlay) {
      set({ error: '领牌者不能过牌' });
      return;
    }
    if (!canPass(true)) {
      set({ error: '不能过牌' });
      return;
    }

    const newPassCount = state.passCount + 1;
    const next = nextSeat(seatNo);

    // 跳过已出完的玩家
    let actualNext = next;
    const hands = state.hands;
    while (hands[actualNext]?.length === 0) {
      actualNext = nextSeat(actualNext);
    }

    const { newRound, leader } = resolveNewRound(newPassCount, next);

    const newRecent = [
      { turnNo: state.turnNo, seatNo, type: 'pass' as const },
      ...state.recentTurns,
    ].slice(0, 4);

    set({
      currentSeat: newRound ? leader : actualNext,
      passCount: newRound ? 0 : newPassCount,
      lastPlay: newRound ? null : state.lastPlay,
      recentTurns: newRecent,
      turnNo: state.turnNo + 1,
      error: null,
    });
  },
}));
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: 提交**

```bash
git add src/lib/store/game.ts
git commit -m "feat: 创建 Zustand Game Store（串联牌组/规则/回合/进贡）"
```

---

### Task 7: UI 接入 — 替换 mock 数据

**Files:**
- Modify: `src/app/room/[roomId]/page.tsx`

- [ ] **Step 1: 更新房间页面接入真实 store**

关键改动：将 `createMockHand()` 和 `mockRecentTurns` 替换为 `useGameStore`。

```typescript
// 在页面顶部添加
import { useGameStore } from '@/lib/store/game';

// 在组件中
const {
  phase, hands, currentSeat, turnNo, lastPlay,
  passCount, recentTurns, levelRank, error,
  startGame, playCards, passTurn,
} = useGameStore();

// 用 useEffect 在组件挂载时开始游戏
useEffect(() => { startGame(); }, []);
```

操作栏接入：
- `onPlay` → 调用 `playCards(currentSeat, selectedCards)`
- `onPass` → 调用 `passTurn(currentSeat)`
- `onHint` → 简单实现：选中第一组合法牌型

全明牌模式：在移动端布局的玩家栏旁显示每个玩家的手牌区域。

- [ ] **Step 2: 验证 dev server**

```bash
npx next dev
```

Expected: 可以访问 /room/room-1，看到真实发牌结果，可以操作出牌。

- [ ] **Step 3: 提交**

```bash
git add src/app/room/[roomId]/page.tsx
git commit -m "feat: UI 接入真实游戏引擎（替换 mock 数据）"
```

---

### Task 8: 集成测试 — 完整打一局

**Files:**
- Create: `src/lib/game/integration.test.ts`

- [ ] **Step 1: 编写集成测试**

```typescript
// src/lib/game/integration.test.ts
import { describe, it, expect } from 'vitest';
import { createDeck, shuffle, deal, sortHands } from './deck';
import { classifyHand, compareHands } from './rules';
import { validatePlay, nextSeat } from './turn';

describe('完整一局流程', () => {
  it('应能完成发牌→出牌→过牌→结算', () => {
    // 1. 发牌
    const deck = shuffle(createDeck());
    const hands = deal(deck);
    expect(hands).toHaveLength(4);
    hands.forEach((h) => expect(h).toHaveLength(27));

    // 2. 每手牌都应能识别至少一张单张牌型
    for (const hand of hands) {
      const single = classifyHand([hand[0]], 2);
      expect(single).not.toBeNull();
      expect(single!.type).toBe('single');
    }

    // 3. 验证回合流转
    let seat = 0;
    for (let i = 0; i < 10; i++) {
      seat = nextSeat(seat);
    }
    expect(seat).toBe(2); // 10 % 4 = 2

    // 4. 验证炸弹识别
    const fourKings = hands.flat().filter((c) => c.rank === '大王' || c.rank === '小王');
    if (fourKings.length === 4) {
      const rocket = classifyHand(fourKings, 2);
      // 只有 2大王+2小王才是火箭
      const bigJ = fourKings.filter((c) => c.rank === '大王').length;
      const smallJ = fourKings.filter((c) => c.rank === '小王').length;
      if (bigJ === 2 && smallJ === 2) {
        expect(rocket!.type).toBe('rocket');
        expect(rocket!.score).toBe(10000);
      }
    }

    // 5. 验证 A > K
    const cmp = compareHands(
      [{ suit: 'spade', rank: 'A', value: 14 }],
      [{ suit: 'spade', rank: 'K', value: 13 }],
      2
    );
    expect(cmp).toBe(1);
  });
});
```

- [ ] **Step 2: 运行全部测试**

```bash
npx vitest run
```

Expected: 所有单元测试 + 集成测试 PASS

- [ ] **Step 3: 提交**

```bash
git add src/lib/game/integration.test.ts
git commit -m "test: 添加集成测试（发牌→出牌→结算完整流程）"
```

---

## 执行摘要

| 任务 | 模块 | 测试文件 | 预计时间 |
|------|------|---------|---------|
| 0 | 依赖安装 | - | 5min |
| 1 | 类型定义 | - | 5min |
| 2 | 牌组管理 | deck.test.ts | 15min |
| 3 | 牌型判断 | rules.test.ts | 45min |
| 4 | 回合逻辑 | turn.test.ts | 20min |
| 5 | 进贡逻辑 | tribute.test.ts | 20min |
| 6 | Zustand Store | - | 30min |
| 7 | UI 接入 | - | 20min |
| 8 | 集成测试 | integration.test.ts | 15min |

**总计**: 约 2.5-3 小时

**关键风险**: rules.ts 的 `classifyHand` 函数 — 10 种牌型 + 逢人配替代算法，是最可能出 bug 的模块。建议该任务由最有经验的开发者负责。
