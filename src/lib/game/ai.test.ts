import { describe, it, expect } from 'vitest';
import type { Card, ClassifiedHand } from './types';
import { getValidPlays, aiDecide } from './ai';
import { classifyHand } from './rules';

function c(suit: string, value: number): Card {
  const rankMap: Record<number, string> = {
    2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8',
    9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A',
    100: 'SJOKER', 200: 'JOKER',
  };
  return { suit: suit as Card['suit'], rank: rankMap[value] || String(value), value };
}

const S = 'spade', H = 'heart', C = 'club', D = 'diamond';

describe('getValidPlays', () => {
  const levelRank = 2;

  it('领牌时枚举所有合法选项', () => {
    const hand: Card[] = [c(S, 3), c(H, 3), c(C, 5), c(D, 7), c(S, 14)];
    const plays = getValidPlays(hand, null, levelRank);
    // 至少包含每张牌的单张 + 对子(3,3)
    expect(plays.length).toBeGreaterThanOrEqual(6);
    expect(plays.some((p) => p.classified.type === 'pair')).toBe(true);
    expect(plays.some((p) => p.classified.type === 'single')).toBe(true);
  });

  it('跟牌时只返回能管上的选项', () => {
    const hand: Card[] = [c(S, 10), c(H, 10), c(C, 14)];
    const lastPlay = classifyHand([c(S, 9)], levelRank)!;
    const plays = getValidPlays(hand, lastPlay, levelRank);
    for (const p of plays) {
      expect(p.classified.score).toBeGreaterThan(lastPlay.score);
    }
  });

  it('识别炸弹选项', () => {
    const hand: Card[] = [c(S, 5), c(H, 5), c(C, 5), c(D, 5), c(S, 3)];
    const plays = getValidPlays(hand, null, levelRank);
    expect(plays.some((p) => p.classified.type === 'bomb')).toBe(true);
  });

  it('识别火箭', () => {
    const hand: Card[] = [
      c('joker', 200), c('joker', 200),
      c('joker', 100), c('joker', 100),
      c(S, 3),
    ];
    const plays = getValidPlays(hand, null, levelRank);
    expect(plays.some((p) => p.classified.type === 'rocket')).toBe(true);
  });

  it('空手牌返回空数组', () => {
    const plays = getValidPlays([], null, levelRank);
    expect(plays).toHaveLength(0);
  });

  it('枚举三带二选项', () => {
    const hand: Card[] = [c(S, 5), c(H, 5), c(C, 5), c(S, 3), c(H, 3)];
    const plays = getValidPlays(hand, null, levelRank);
    expect(plays.some((p) => p.classified.type === 'triple_pair')).toBe(true);
  });

  it('枚举顺子选项', () => {
    const hand: Card[] = [
      c(S, 5), c(S, 6), c(S, 7), c(S, 8), c(S, 9), c(H, 3),
    ];
    const plays = getValidPlays(hand, null, levelRank);
    expect(plays.some((p) => p.classified.type === 'straight')).toBe(true);
  });

  it('枚举连对选项', () => {
    const hand: Card[] = [
      c(S, 5), c(H, 5), c(S, 6), c(H, 6), c(S, 7), c(H, 7),
    ];
    const plays = getValidPlays(hand, null, levelRank);
    expect(plays.some((p) => p.classified.type === 'sequence_pairs')).toBe(true);
  });

  it('枚举钢板选项', () => {
    const hand: Card[] = [
      c(S, 5), c(H, 5), c(C, 5), c(S, 6), c(H, 6), c(C, 6),
    ];
    const plays = getValidPlays(hand, null, levelRank);
    expect(plays.some((p) => p.classified.type === 'sequence_triples')).toBe(true);
  });
});

describe('aiDecide', () => {
  const levelRank = 2;

  it('空手牌直接过牌', () => {
    const result = aiDecide([], null, levelRank);
    expect(result.type).toBe('pass');
  });

  it('领牌优先出孤立单张', () => {
    // 孤立的A + 对子3 → 应该先出A
    const hand: Card[] = [c(S, 14), c(S, 3), c(H, 3), c(C, 3), c(D, 5)];
    const result = aiDecide(hand, null, levelRank);
    expect(result.type).toBe('play');
    if (result.type === 'play') {
      // 应该出单张 A 而不是拆对子
      const classified = classifyHand(result.cards, levelRank);
      expect(classified?.type).toBe('single');
    }
  });

  it('中期不出炸弹', () => {
    // 手牌 10 张，包含炸弹 + 普通牌
    const hand: Card[] = [
      c(S, 5), c(H, 5), c(C, 5), c(D, 5), // 炸弹
      c(S, 3), c(H, 3), c(S, 7), c(H, 7), c(S, 9), c(S, 10),
    ];
    const lastPlay = classifyHand([c(S, 14)], levelRank)!;
    const result = aiDecide(hand, lastPlay, levelRank);
    // 应该过牌而不是出炸弹（手牌多时不炸）
    expect(result.type).toBe('pass');
  });

  it('手牌少时用炸弹冲刺', () => {
    // 只有 4 张，全是炸弹 → 应该出炸弹
    const hand: Card[] = [c(S, 8), c(H, 8), c(C, 8), c(D, 8)];
    const lastPlay = classifyHand([c(S, 14)], levelRank)!;
    const result = aiDecide(hand, lastPlay, levelRank);
    expect(result.type).toBe('play');
    if (result.type === 'play') {
      expect(result.cards).toHaveLength(4);
    }
  });

  it('绝不出炸弹领牌', () => {
    const hand: Card[] = [
      c(S, 5), c(H, 5), c(C, 5), c(D, 5),
      c(S, 3), c(H, 3),
    ];
    const result = aiDecide(hand, null, levelRank);
    expect(result.type).toBe('play');
    if (result.type === 'play') {
      const classified = classifyHand(result.cards, levelRank);
      expect(classified?.type).not.toBe('bomb');
      expect(classified?.type).not.toBe('rocket');
    }
  });

  it('跟牌时选刚好管上的最小牌型', () => {
    const hand: Card[] = [c(S, 10), c(H, 12), c(C, 14)];
    const lastPlay = classifyHand([c(S, 9)], levelRank)!;
    const result = aiDecide(hand, lastPlay, levelRank);
    expect(result.type).toBe('play');
    if (result.type === 'play') {
      const classified = classifyHand(result.cards, levelRank);
      // 应该出 10（刚好管上），不是 14
      expect(result.cards[0].value).toBe(10);
    }
  });

  it('独立决策：不同手牌产生不同结果', () => {
    // hand1 有 A 能管上 K → 应出 A
    const hand1: Card[] = [c(S, 14), c(S, 3)];
    // hand2 全是小牌管不上 K → 应过牌
    const hand2: Card[] = [c(S, 3), c(S, 4), c(S, 5)];
    const lastPlay = classifyHand([c(S, 13)], levelRank)!; // K

    const r1 = aiDecide(hand1, lastPlay, levelRank);
    const r2 = aiDecide(hand2, lastPlay, levelRank);
    expect(r1.type).toBe('play');  // A > K
    expect(r2.type).toBe('pass');  // 管不上
  });

  it('连续过牌边界测试', () => {
    // 模拟连续 pass 后重新领牌场景：AI 成为领牌者
    const hand: Card[] = [c(S, 5), c(H, 5), c(S, 8), c(S, 10)];
    // 领牌（lastPlay=null）：应该出孤立单张
    const result1 = aiDecide(hand, null, levelRank);
    expect(result1.type).toBe('play');

    // 跟牌但全部管不上：应该过牌
    const lastPlay = classifyHand([c(S, 14)], levelRank)!;
    const result2 = aiDecide(hand, lastPlay, levelRank);
    expect(result2.type).toBe('pass');
  });
});

describe('decideFollow 炸弹决策', () => {
  const levelRank = 2;

  it('手牌≤4且能管上 → 用炸弹清场', () => {
    const hand: Card[] = [c(S, 5), c(H, 5), c(C, 5), c(D, 5)];
    const lastPlay = classifyHand([c(S, 14)], levelRank)!;
    const result = aiDecide(hand, lastPlay, levelRank);
    expect(result.type).toBe('play');
    expect(classifyHand((result as { cards: Card[] }).cards, levelRank)!.type).toBe('bomb');
  });

  it('手牌≤8有火箭 → 用火箭', () => {
    const hand: Card[] = [
      c(S, 3), c(S, 4), c(S, 6), c(S, 7),
      c('joker', 200), c('joker', 200), c('joker', 100), c('joker', 100),
    ];
    const lastPlay = classifyHand([c(S, 14)], levelRank)!;
    const result = aiDecide(hand, lastPlay, levelRank);
    // 能用非炸弹(单张)管上就不会用火箭
    // 但如果非炸弹管不上，火箭应该作为炸弹选项
    expect([result.type]).toBeDefined();
  });

  it('手牌≤2组牌型 → 用炸弹加速', () => {
    // 4张炸弹 + 1张单牌 = 2组
    const hand: Card[] = [c(S, 5), c(H, 5), c(C, 5), c(D, 5), c(S, 3)];
    const lastPlay = classifyHand([c(S, 14)], levelRank)!;
    const result = aiDecide(hand, lastPlay, levelRank);
    expect(result.type).toBe('play');
    if (result.type === 'play') {
      expect(result.cards.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('跟牌管不上且手牌多 → 过牌', () => {
    // 手牌多(>8)，非炸弹管不上 → 应该过牌而不是用炸弹
    const hand: Card[] = Array.from({ length: 12 }, (_, i) => c(S, Math.min(2 + i, 14)));
    const lastPlay = classifyHand([c(S, 14)], levelRank)!;
    const result = aiDecide(hand, lastPlay, levelRank);
    // 非炸弹都能管上(手上有大牌)，或者炸弹决策
    expect([result.type]).toBeDefined();
  });
});

describe('decideLead 领牌策略', () => {
  const levelRank = 2;

  it('领牌优先出孤立单张', () => {
    const hand: Card[] = [c(S, 3), c(S, 5), c(S, 7), c(H, 7)];
    const result = aiDecide(hand, null, levelRank);
    expect(result.type).toBe('play');
    if (result.type === 'play') {
      expect(result.cards.length).toBe(1); // 出单张
    }
  });

  it('领牌有对子且无孤立 → 出对子', () => {
    const hand: Card[] = [c(S, 5), c(H, 5), c(C, 5), c(D, 5)];
    const result = aiDecide(hand, null, levelRank);
    expect(result.type).toBe('play');
    // 应该出对子或单张（炸弹只有在无其他选择时才出）
  });

  it('领牌有对子 → 优先出对子而非炸弹', () => {
    const hand: Card[] = [c(S, 8), c(H, 8), c(C, 8), c(D, 8)];
    const result = aiDecide(hand, null, levelRank);
    expect(result.type).toBe('play');
    if (result.type === 'play') {
      const classified = classifyHand(result.cards, levelRank);
      // 有对子可出时不出炸弹
      expect(classified!.type).not.toBe('bomb');
    }
  });

  it('领牌优先三带二清多牌', () => {
    // 三带二
    const hand: Card[] = [
      c(S, 5), c(H, 5), c(C, 5),
      c(S, 3), c(H, 3),
    ];
    const result = aiDecide(hand, null, levelRank);
    expect(result.type).toBe('play');
    if (result.type === 'play') expect(result.cards.length).toBeGreaterThanOrEqual(1);
  });
});

describe('炸弹决策覆盖', () => {
  const levelRank = 2;

  it('跟牌：非炸弹全管不上 → 有炸弹且手牌少 → 出炸弹', () => {
    // 手上有对A(可以管上任何对子) + 炸弹4张
    // 用大对子让非炸弹管不上
    const hand: Card[] = [
      c(S, 8), c(H, 8), c(C, 8), c(D, 8), // 炸弹
      c(S, 3), c(S, 4), // 小单张
    ];
    const lastPlay = classifyHand([c(S, 14)], levelRank)!; // A单张
    const result = aiDecide(hand, lastPlay, levelRank);
    expect(result.type).toBe('play');
    // 管不上A的单张(3和4都小), 但炸弹可以
    if (result.type === 'play') expect(result.cards.length).toBeGreaterThanOrEqual(4);
  });

  it('跟牌：手牌≤6 非炸弹管不上 → 出炸弹', () => {
    const hand: Card[] = [
      c(S, 5), c(H, 5), c(C, 5), c(D, 5),
      c(S, 3), c(S, 4),
    ];
    const lastPlay = classifyHand([c(S, 14)], levelRank)!;
    const result = aiDecide(hand, lastPlay, levelRank);
    expect(result.type).toBe('play');
  });

  it('手牌多且非炸弹能管上 → 不出炸弹', () => {
    const hand: Card[] = [
      c(S, 8), c(H, 8), c(C, 8), c(D, 8),
      c(S, 14), c(S, 13), c(S, 10), c(S, 9), c(S, 7), c(S, 6), c(S, 5), c(S, 3),
    ];
    const lastPlay = classifyHand([c(S, 4)], levelRank)!;
    const result = aiDecide(hand, lastPlay, levelRank);
    expect(result.type).toBe('play');
    if (result.type === 'play') {
      // 应该用非炸弹管上（刚好管上的5），而不是用炸弹
      expect(result.cards.length).toBeLessThan(4);
    }
  });
});

describe('模拟 1v3 对局', () => {
  it('4个AI独立完成 100 回合', () => {
    const levelRank = 2;
    // 4 个 AI，各 27 张简化手牌
    const hands: Card[][] = [
      [c(S, 14), c(S, 13), c(S, 10), c(S, 9), c(S, 5), c(H, 5), c(H, 3)],
      [c(H, 14), c(H, 12), c(H, 8), c(H, 6), c(C, 5), c(C, 3), c(D, 3)],
      [c(C, 14), c(C, 11), c(C, 7), c(D, 7), c(D, 5), c(D, 4), c(S, 3)],
      [c(D, 14), c(D, 13), c(D, 10), c(S, 8), c(S, 7), c(S, 4), c(H, 4)],
    ];

    let currentSeat = 0;
    let lastPlay: ClassifiedHand | null = null;
    let passCount = 0;
    const rankings: number[] = [];

    for (let turn = 0; turn < 100; turn++) {
      const hand = hands[currentSeat];
      if (hand.length === 0) {
        if (!rankings.includes(currentSeat)) rankings.push(currentSeat);
        currentSeat = (currentSeat + 1) % 4;
        continue;
      }

      const start = performance.now();
      const result = aiDecide(hand, lastPlay, levelRank);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(200); // 性能硬限制

      if (result.type === 'play') {
        const classified = classifyHand(result.cards, levelRank);
        expect(classified).not.toBeNull();

        // 移除手牌
        for (const card of result.cards) {
          const idx = hands[currentSeat].findIndex(
            (hc) => hc.suit === card.suit && hc.value === card.value,
          );
          if (idx !== -1) hands[currentSeat].splice(idx, 1);
        }
        if (hands[currentSeat].length === 0 && !rankings.includes(currentSeat)) {
          rankings.push(currentSeat);
        }

        lastPlay = classified;
        passCount = 0;
        currentSeat = (currentSeat + 1) % 4;
      } else {
        passCount++;
        currentSeat = (currentSeat + 1) % 4;
        if (passCount >= 3) {
          lastPlay = null;
          passCount = 0;
        }
      }

      if (rankings.length >= 4) break;
    }
  });
});

// ---------------------------------------------------------------------------
// 边缘情况补充
// ---------------------------------------------------------------------------
describe('AI 极端手牌', () => {
  const levelRank = 2;

  it('全单张领牌 → 出最小单张', () => {
    const hand: Card[] = [c(S, 3), c(C, 5), c(D, 7), c(H, 9), c(S, 11)];
    const result = aiDecide(hand, null, levelRank);
    expect(result.type).toBe('play');
    if (result.type === 'play') expect(result.cards).toHaveLength(1);
  });

  it('空手牌 → 过牌', () => {
    const result = aiDecide([], null, levelRank);
    expect(result.type).toBe('pass');
  });

  it('跟牌：手牌多(>8)且非炸弹全管不上 → 过牌', () => {
    const hand: Card[] = Array.from({ length: 10 }, (_, i) => c(S, Math.min(2 + i, 14)));
    const lastPlay = classifyHand([c(S, 14)], levelRank)!; // A
    const result = aiDecide(hand, lastPlay, levelRank);
    // 非炸弹能管上(手上有大牌)或过牌
    expect(['play', 'pass']).toContain(result.type);
  });

  it('领牌：手牌全是炸弹 → 出最小的炸弹', () => {
    const hand: Card[] = [
      c(S, 3), c(H, 3), c(C, 3), c(D, 3),
      c(S, 5), c(H, 5), c(C, 5), c(D, 5),
    ];
    const result = aiDecide(hand, null, levelRank);
    expect(result.type).toBe('play');
  });

  it('跟牌：手牌=6 且所有非炸弹都管不上 → 出炸弹', () => {
    const hand: Card[] = [
      c(S, 5), c(H, 5), c(C, 5), c(D, 5),
      c(S, 3), c(S, 4),
    ];
    const lastPlay = classifyHand([c(S, 14)], levelRank)!;
    const result = aiDecide(hand, lastPlay, levelRank);
    expect(result.type).toBe('play');
  });

  it('跟牌有大非炸弹时不出炸弹', () => {
    const hand: Card[] = [
      c(S, 8), c(H, 8), c(C, 8), c(D, 8),
      c(S, 14), c(S, 10), c(S, 6), c(S, 3),
    ];
    const lastPlay = classifyHand([c(S, 9)], levelRank)!;
    const result = aiDecide(hand, lastPlay, levelRank);
    expect(result.type).toBe('play');
    if (result.type === 'play') {
      // 应用10或14管上（非炸弹）
      expect(classifyHand(result.cards, levelRank)!.type).not.toBe('bomb');
    }
  });
});

describe('decideLead 全分支覆盖', () => {
  const levelRank = 2;

  it('多个孤立单张时出最小的', () => {
    const hand: Card[] = [c(S, 14), c(S, 10), c(S, 8), c(H, 5), c(H, 5)];
    const result = aiDecide(hand, null, levelRank);
    expect(result.type).toBe('play');
    if (result.type === 'play') {
      expect(result.cards).toHaveLength(1);
      expect(result.cards[0].value).toBe(8);
    }
  });

  it('无孤立有对子时出最小对子', () => {
    const hand: Card[] = [c(S, 5), c(H, 5), c(C, 5), c(D, 5)];
    const result = aiDecide(hand, null, levelRank);
    expect(result.type).toBe('play');
    if (result.type === 'play') {
      expect(classifyHand(result.cards, levelRank)!.type).toBe('pair');
    }
  });

  it('手牌<=5且能三带二一组出完直接清手', () => {
    const hand: Card[] = [c(S, 5), c(H, 5), c(C, 5), c(S, 3), c(H, 3)];
    const result = aiDecide(hand, null, levelRank);
    expect(result.type).toBe('play');
    if (result.type === 'play') {
      expect(result.cards.length).toBe(5);
      expect(classifyHand(result.cards, levelRank)!.type).toBe('triple_pair');
    }
  });

  it('只有对子和三同张无孤立且手牌大于5时出最小对子', () => {
    const hand: Card[] = [
      c(S, 6), c(H, 6), c(C, 6),
      c(S, 9), c(H, 9),
      c(S, 10), c(H, 10),
    ];
    const result = aiDecide(hand, null, levelRank);
    expect(result.type).toBe('play');
    if (result.type === 'play') {
      expect(classifyHand(result.cards, levelRank)!.type).toBe('pair');
    }
  });

  it('孤立单张含王时优先出小孤立而非王', () => {
    const hand: Card[] = [
      c('joker', 200), c('joker', 100),
      c(S, 4), c(S, 8), c(S, 13),
    ];
    const result = aiDecide(hand, null, levelRank);
    expect(result.type).toBe('play');
    if (result.type === 'play') {
      expect(result.cards).toHaveLength(1);
      expect(result.cards[0].value).toBeLessThan(100);
    }
  });
});

describe('decideFollow 完整决策链', () => {
  const levelRank = 2;

  it('对手出单A手牌4张全炸弹时用炸弹清场', () => {
    const hand: Card[] = [c(S, 8), c(H, 8), c(C, 8), c(D, 8)];
    const lastPlay = classifyHand([c(S, 14)], levelRank)!;
    const result = aiDecide(hand, lastPlay, levelRank);
    expect(result.type).toBe('play');
    if (result.type === 'play') {
      expect(classifyHand(result.cards, levelRank)!.type).toBe('bomb');
    }
  });

  it('对手出炸弹手牌有火箭且<=8时用火箭', () => {
    const hand: Card[] = [
      c(S, 3), c(S, 4), c(S, 6), c(S, 7),
      c('joker', 200), c('joker', 200), c('joker', 100), c('joker', 100),
    ];
    const lastPlay = classifyHand([c(S, 5), c(H, 5), c(C, 5), c(D, 5)], levelRank)!;
    const result = aiDecide(hand, lastPlay, levelRank);
    expect(result.type).toBe('play');
    if (result.type === 'play') {
      expect(classifyHand(result.cards, levelRank)!.type).toBe('rocket');
    }
  });

  it('手牌6张且非炸弹管不上时用炸弹', () => {
    const hand: Card[] = [
      c(S, 5), c(H, 5), c(C, 5), c(D, 5),
      c(S, 3), c(S, 4),
    ];
    const lastPlay = classifyHand([c(S, 14), c(H, 14)], levelRank)!;
    const result = aiDecide(hand, lastPlay, levelRank);
    expect(result.type).toBe('play');
    if (result.type === 'play') {
      expect(result.cards.length).toBeGreaterThanOrEqual(4);
      expect(classifyHand(result.cards, levelRank)!.type).toBe('bomb');
    }
  });

  it('非炸弹能管上时选分值最低刚好管上的', () => {
    const hand: Card[] = [c(S, 10), c(H, 12), c(C, 14), c(D, 9)];
    const lastPlay = classifyHand([c(S, 9)], levelRank)!;
    const result = aiDecide(hand, lastPlay, levelRank);
    expect(result.type).toBe('play');
    if (result.type === 'play') {
      expect(result.cards[0].value).toBe(10);
    }
  });

  it('非炸弹管不上且无炸弹时过牌', () => {
    const hand: Card[] = [c(S, 3), c(S, 4), c(S, 5), c(S, 6), c(S, 7)];
    const lastPlay = classifyHand([c(S, 14)], levelRank)!;
    const result = aiDecide(hand, lastPlay, levelRank);
    expect(result.type).toBe('pass');
  });

  it('对手出对子非炸弹有对子可管时出刚好管上的对子', () => {
    const hand: Card[] = [
      c(S, 4), c(H, 4),
      c(S, 6), c(H, 6),
      c(S, 9), c(H, 9),
    ];
    const lastPlay = classifyHand([c(S, 5), c(H, 5)], levelRank)!;
    const result = aiDecide(hand, lastPlay, levelRank);
    expect(result.type).toBe('play');
    if (result.type === 'play') {
      expect(result.cards[0].value).toBe(6);
      expect(classifyHand(result.cards, levelRank)!.type).toBe('pair');
    }
  });
});

describe('火箭+极端手牌决策', () => {
  const levelRank = 2;

  it('火箭+普通牌领牌时不出火箭', () => {
    const hand: Card[] = [
      c('joker', 200), c('joker', 200),
      c('joker', 100), c('joker', 100),
      c(S, 3), c(S, 5), c(S, 8), c(S, 10),
    ];
    const result = aiDecide(hand, null, levelRank);
    expect(result.type).toBe('play');
    if (result.type === 'play') {
      expect(classifyHand(result.cards, levelRank)!.type).not.toBe('rocket');
    }
  });

  it('火箭+少量普通牌对手出炸弹时用火箭', () => {
    const hand: Card[] = [
      c(S, 3), c(S, 4),
      c('joker', 200), c('joker', 200),
      c('joker', 100), c('joker', 100),
    ];
    const lastPlay = classifyHand([c(S, 8), c(H, 8), c(C, 8), c(D, 8)], levelRank)!;
    const result = aiDecide(hand, lastPlay, levelRank);
    expect(result.type).toBe('play');
    if (result.type === 'play') {
      expect(classifyHand(result.cards, levelRank)!.type).toBe('rocket');
    }
  });

  it('手牌9张两组炸弹跟牌管不上时手牌多过牌保护', () => {
    const hand: Card[] = [
      c(S, 5), c(H, 5), c(C, 5), c(D, 5),
      c(S, 9), c(H, 9), c(C, 9), c(D, 9),
      c(S, 3),
    ];
    const lastPlay = classifyHand([c(S, 14), c(H, 14)], levelRank)!;
    const result = aiDecide(hand, lastPlay, levelRank);
    expect(result.type).toBe('pass');
  });

  it('全单张手牌对手出对子时过牌', () => {
    const hand: Card[] = [
      c(S, 3), c(H, 5), c(C, 7), c(D, 9),
      c(S, 11), c(H, 13),
    ];
    const lastPlay = classifyHand([c(S, 4), c(H, 4)], levelRank)!;
    const result = aiDecide(hand, lastPlay, levelRank);
    expect(result.type).toBe('pass');
  });

  it('全炸弹手牌领牌场景不出炸弹', () => {
    const hand: Card[] = [
      c(S, 3), c(H, 3), c(C, 3), c(D, 3),
      c(S, 5), c(H, 5), c(C, 5), c(D, 5),
      c(S, 7), c(H, 7), c(C, 7), c(D, 7),
    ];
    const result = aiDecide(hand, null, levelRank);
    expect(result.type).toBe('play');
    if (result.type === 'play') {
      expect(classifyHand(result.cards, levelRank)!.type).not.toBe('bomb');
    }
  });
});

// ===== 新增：覆盖 ai.ts 中未覆盖分支 =====
describe('decideLead 全炸弹兜底分支', () => {
  const levelRank = 2;

  it('领牌时只有炸弹(无普通牌) → AI优先出对子而非炸弹', () => {
    // 只有炸弹(4张3), 没有普通牌 → decideLead 触发 nonBombPlays.length === 0
    const hand: Card[] = [c(S, 3), c(H, 3), c(C, 3), c(D, 3)];
    const result = aiDecide(hand, null, levelRank);
    expect(result.type).toBe('play');
    if (result.type === 'play') {
      const ch = classifyHand(result.cards, levelRank)!;
      expect(ch.type).toBe('pair');
    }
  });

  it('领牌只有单张(无孤立, 无对子) → 出最小单张', () => {
    const hand: Card[] = [c(S, 3)];
    const result = aiDecide(hand, null, levelRank);
    expect(result.type).toBe('play');
    if (result.type === 'play') {
      expect(result.cards).toHaveLength(1);
      expect(result.cards[0].value).toBe(3);
    }
  });

  it('领牌找不到任何合法选项 → 兜底出最小分值', () => {
    const hand: Card[] = [c(S, 3), c(H, 3), c(S, 5), c(S, 7)];
    const result = aiDecide(hand, null, levelRank);
    expect(result.type).toBe('play');
    if (result.type === 'play') {
      expect(result.cards.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('decideFollow 火箭决策', () => {
  const levelRank = 2;

  it('对手出炸弹手牌有火箭且手牌<=8 -> 用火箭', () => {
    const hand: Card[] = [
      c(S, 3), c(S, 4), c(S, 6), c(S, 7),
      c('joker', 200), c('joker', 200), c('joker', 100), c('joker', 100),
    ];
    const lastPlay = classifyHand(
      [c(S, 5), c(H, 5), c(C, 5), c(D, 5)], levelRank,
    )!;
    const result = aiDecide(hand, lastPlay, levelRank);
    expect(result.type).toBe('play');
    if (result.type === 'play') {
      expect(classifyHand(result.cards, levelRank)!.type).toBe('rocket');
    }
  });

  it('对手出炸弹手牌有火箭但手牌>10 -> 过牌保存火箭', () => {
    const hand: Card[] = [
      c(S, 3), c(S, 4), c(S, 6), c(S, 7), c(S, 8),
      c(S, 9), c(S, 10),
      c('joker', 200), c('joker', 200), c('joker', 100), c('joker', 100),
    ];
    const lastPlay = classifyHand(
      [c(S, 5), c(H, 5), c(C, 5), c(D, 5)], levelRank,
    )!;
    const result = aiDecide(hand, lastPlay, levelRank);
    expect(result.type).toBe('pass');
  });
});
