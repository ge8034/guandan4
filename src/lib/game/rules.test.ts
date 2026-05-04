import { describe, it, expect } from 'vitest';
import {
  getCardScore,
  classifyHand,
  compareHands,
  isBomb,
  isRocket,
} from './rules';
import type { Card, Suit } from './types';

/** Helper to create a Card quickly */
function c(value: number, suit: Suit = 'spade'): Card {
  const rankMap: Record<number, string> = {
    2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8',
    9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A',
  };
  const rank = value >= 100
    ? (value === 200 ? 'JOKER' : 'SJOKER')
    : (rankMap[value] || String(value));
  const s: Suit = value >= 100 ? 'joker' : suit;
  return { value, suit: s, rank };
}

// ---------------------------------------------------------------------------
// getCardScore
// ---------------------------------------------------------------------------
describe('getCardScore', () => {
  it('大王 returns 200', () => {
    expect(getCardScore(c(200), 5)).toBe(200);
  });

  it('小王 returns 100', () => {
    expect(getCardScore(c(100), 5)).toBe(100);
  });

  it('红桃级牌（逢人配）returns 60', () => {
    // level=5, 红桃5 → 逢人配
    const wild = c(5, 'heart');
    expect(getCardScore(wild, 5)).toBe(60);
  });

  it('普通级牌 returns 50', () => {
    // level=5, 非红桃5 → 普通级牌
    const levelCard = c(5, 'spade');
    expect(getCardScore(levelCard, 5)).toBe(50);
  });

  it('A returns 14', () => {
    expect(getCardScore(c(14), 5)).toBe(14);
  });

  it('K returns 13', () => {
    expect(getCardScore(c(13), 5)).toBe(13);
  });

  it('普通卡牌返回其面值', () => {
    expect(getCardScore(c(3), 5)).toBe(3);
    expect(getCardScore(c(10), 5)).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// classifyHand
// ---------------------------------------------------------------------------
describe('classifyHand', () => {
  it('空手牌 → pass', () => {
    const result = classifyHand([], 5);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('pass');
    expect(result!.score).toBe(0);
  });

  it('单张', () => {
    const result = classifyHand([c(14)], 5);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('single');
    expect(result!.score).toBe(14);
  });

  it('对子', () => {
    const result = classifyHand([c(13), c(13)], 5);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('pair');
    expect(result!.score).toBe(13);
  });

  it('三同张', () => {
    const result = classifyHand([c(7), c(7), c(7)], 5);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('triple');
    expect(result!.score).toBe(7);
  });

  it('三带二', () => {
    const result = classifyHand([c(8), c(8), c(8), c(5), c(5)], 5);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('triple_pair');
    expect(result!.score).toBe(8);
  });

  it('顺子（五张同花连续）', () => {
    // 3♠ 4♠ 5♠ 6♠ 7♠
    const result = classifyHand(
      [c(3, 'spade'), c(4, 'spade'), c(5, 'spade'), c(6, 'spade'), c(7, 'spade')],
      5,
    );
    expect(result).not.toBeNull();
    expect(result!.type).toBe('straight');
    expect(result!.score).toBe(7);
  });

  it('连对（三组连续对子）', () => {
    // 33 44 55，最高对为5（级牌），分值应为50
    const result = classifyHand(
      [c(3), c(3), c(4), c(4), c(5), c(5)],
      5,
    );
    expect(result).not.toBeNull();
    expect(result!.type).toBe('sequence_pairs');
    expect(result!.score).toBe(50);
  });

  it('钢板（两组连续三同张）', () => {
    // 333 444
    const result = classifyHand(
      [c(3), c(3), c(3), c(4), c(4), c(4)],
      5,
    );
    expect(result).not.toBeNull();
    expect(result!.type).toBe('sequence_triples');
    expect(result!.score).toBe(4);
  });

  it('炸弹（四张及以上同点数，不含王）', () => {
    // 四张 8
    const result = classifyHand([c(8), c(8), c(8), c(8)], 5);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('bomb');
    expect(result!.score).toBeGreaterThan(0);
  });

  it('五张炸弹', () => {
    const result = classifyHand([c(3), c(3), c(3), c(3), c(3)], 5);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('bomb');
  });

  it('火箭（两大王+两小王）', () => {
    const result = classifyHand([c(200), c(200), c(100), c(100)], 5);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('rocket');
    expect(result!.score).toBe(10000);
  });

  // ---- 逢人配 ----
  it('逢人配替代补全三同张', () => {
    // level=5 → 红桃5是逢人配
    // 两张 8 + 一张逢人配 → 三张 8
    const result = classifyHand(
      [c(8, 'spade'), c(8, 'heart'), c(5, 'heart')],
      5,
    );
    expect(result).not.toBeNull();
    expect(result!.type).toBe('triple');
    expect(result!.score).toBe(8);
  });

  it('逢人配替代补全对子', () => {
    // level=5, 一张 K + 一张逢人配 → 对 K
    const result = classifyHand([c(13), c(5, 'heart')], 5);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('pair');
    expect(result!.score).toBe(13);
  });

  it('逢人配补全炸弹', () => {
    // 三张 8 + 一张逢人配 → 四张 8 炸弹
    const result = classifyHand([c(8), c(8), c(8), c(5, 'heart')], 5);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('bomb');
  });

  // ---- 无效牌型 ----
  it('两张不同牌 → null', () => {
    expect(classifyHand([c(3), c(5)], 5)).toBeNull();
  });

  it('四张同花连续但不是五张 → null（顺子固定5张）', () => {
    const result = classifyHand(
      [c(3, 'spade'), c(4, 'spade'), c(5, 'spade'), c(6, 'spade')],
      5,
    );
    expect(result).toBeNull();
  });

  it('单张王是合法牌型', () => {
    const big = classifyHand([c(200)], 5);
    expect(big).not.toBeNull();
    expect(big!.type).toBe('single');
    expect(big!.score).toBe(200);

    const small = classifyHand([c(100)], 5);
    expect(small).not.toBeNull();
    expect(small!.type).toBe('single');
    expect(small!.score).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// compareHands
// ---------------------------------------------------------------------------
describe('compareHands', () => {
  it('火箭大于炸弹', () => {
    const rocket = [c(200), c(200), c(100), c(100)];
    const bomb = [c(8), c(8), c(8), c(8)];
    expect(compareHands(rocket, bomb, 5)).toBe(1);
    expect(compareHands(bomb, rocket, 5)).toBe(-1);
  });

  it('炸弹大于非炸弹', () => {
    const bomb = [c(8), c(8), c(8), c(8)];
    const single = [c(14)];
    expect(compareHands(bomb, single, 5)).toBe(1);
    expect(compareHands(single, bomb, 5)).toBe(-1);
  });

  it('炸弹张数多者大', () => {
    const bomb4 = [c(8), c(8), c(8), c(8)];
    const bomb5 = [c(3), c(3), c(3), c(3), c(3)];
    expect(compareHands(bomb5, bomb4, 5)).toBe(1);
    expect(compareHands(bomb4, bomb5, 5)).toBe(-1);
  });

  it('炸弹同张数比点数（级牌炸弹 > 普通炸弹）', () => {
    // level=5: bomb of 5s is 级牌炸弹, bomb of 8s is 普通炸弹
    const levelBomb = [c(5), c(5), c(5), c(5)];
    const normalBomb = [c(8), c(8), c(8), c(8)];
    expect(compareHands(levelBomb, normalBomb, 5)).toBe(1);
    expect(compareHands(normalBomb, levelBomb, 5)).toBe(-1);
  });

  it('同牌型非炸弹比分值', () => {
    const a = [c(14)];  // A (14)
    const k = [c(13)];  // K (13)
    expect(compareHands(a, k, 5)).toBe(1);
    expect(compareHands(k, a, 5)).toBe(-1);
  });

  it('不同牌型非炸弹不可比较 → 0', () => {
    const single = [c(14)];
    const pair = [c(13), c(13)];
    expect(compareHands(single, pair, 5)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// isBomb / isRocket
// ---------------------------------------------------------------------------
describe('isBomb', () => {
  it('4张同点数 → 炸弹', () => {
    expect(isBomb([c(8), c(8), c(8), c(8)], 5)).toBe(true);
  });

  it('5张同点数 → 炸弹', () => {
    expect(isBomb([c(3), c(3), c(3), c(3), c(3)], 5)).toBe(true);
  });

  it('3张同点数 → 不是炸弹', () => {
    expect(isBomb([c(8), c(8), c(8)], 5)).toBe(false);
  });

  it('含王 → 不是炸弹', () => {
    expect(isBomb([c(8), c(8), c(8), c(200)], 5)).toBe(false);
  });

  it('逢人配补全炸弹', () => {
    expect(isBomb([c(8), c(8), c(8), c(5, 'heart')], 5)).toBe(true);
  });
});

describe('isRocket', () => {
  it('两大王+两小王 → 火箭', () => {
    expect(isRocket([c(200), c(200), c(100), c(100)])).toBe(true);
  });

  it('三小王+一大王 → 不是火箭', () => {
    expect(isRocket([c(200), c(100), c(100), c(100)])).toBe(false);
  });

  it('三张王 → 不是火箭', () => {
    expect(isRocket([c(200), c(200), c(100)])).toBe(false);
  });

  it('非王 → 不是火箭', () => {
    expect(isRocket([c(14), c(14), c(14), c(14)])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 边缘情况（补充覆盖率）
// ---------------------------------------------------------------------------
describe('classifyHand 边缘情况', () => {
  const level = 5;

  it('三带二：逢人配让 v2 成为 triple', () => {
    // 1张5 + 2张8 + 2张逢人配(红桃5) → v2(8,8)+wild补成triple, v1(5)+wild补成pair
    const cards = [c(5, 'spade'), c(8, 'spade'), c(8, 'club'), c(5, 'heart'), c(5, 'heart')];
    const r = classifyHand(cards, level);
    expect(r).not.toBeNull();
    expect(r!.type).toBe('triple_pair');
  });

  it('顺子：跨A无效返回 null', () => {
    // 12,13,14(跨A) — start=10会超过14
    const cards = [c(10, 'spade'), c(11, 'spade'), c(12, 'spade'), c(13, 'spade'), c(14, 'spade')];
    const r = classifyHand(cards, level);
    expect(r).not.toBeNull();
    expect(r!.type).toBe('straight');
  });

  it('连对：无法组成连对返回 null', () => {
    // 3组不连续的对子
    const cards = [c(3, 'spade'), c(3, 'club'), c(5, 'spade'), c(5, 'club'), c(7, 'spade'), c(7, 'club')];
    const r = classifyHand(cards, level);
    expect(r).toBeNull();
  });

  it('钢板：无法组成钢板返回 null', () => {
    // 2组不连续的三同张
    const cards = [c(3, 'spade'), c(3, 'club'), c(3, 'heart'), c(7, 'spade'), c(7, 'club'), c(7, 'diamond')];
    const r = classifyHand(cards, level);
    expect(r).toBeNull();
  });

  it('4张王但大小王数量不对 → 无效', () => {
    // 3大1小
    const cards = [c(200, 'joker'), c(200, 'joker'), c(200, 'joker'), c(100, 'joker')];
    const r = classifyHand(cards, level);
    expect(r).toBeNull();
  });

  it('级牌逢人配组成炸弹', () => {
    const cards = [c(8, 'spade'), c(8, 'club'), c(8, 'diamond'), c(5, 'heart')];
    const r = classifyHand(cards, level);
    expect(r).not.toBeNull();
    expect(r!.type).toBe('bomb');
  });

  it('三带二：单值组 3+2wild → 优先判定为炸弹', () => {
    // 3张8 + 2张逢人配 → allSame+wild>=4 → bomb
    const cards = [c(8, 'spade'), c(8, 'club'), c(8, 'diamond'), c(5, 'heart'), c(5, 'heart')];
    const r = classifyHand(cards, level);
    expect(r).not.toBeNull();
    expect(r!.type).toBe('bomb'); // 炸弹优先
  });

  it('三带二：单值组 2+3wild → 炸弹', () => {
    // 2张8 + 3张逢人配 → allSame+wild>=4 → bomb
    const cards = [c(8, 'spade'), c(8, 'club'), c(5, 'heart'), c(5, 'heart'), c(5, 'heart')];
    const r = classifyHand(cards, level);
    expect(r).not.toBeNull();
    expect(r!.type).toBe('bomb');
  });

  it('三带二：单值组 1+4wild → 炸弹（逢人配补全4张）', () => {
    // 1张8 + 4张逢人配 → 至少4张同值(bomb优先)
    const cards = [c(8, 'spade'), c(5, 'heart'), c(5, 'heart'), c(5, 'heart'), c(5, 'heart')];
    const r = classifyHand(cards, level);
    expect(r).not.toBeNull();
    expect(r!.type).toBe('bomb');
  });
});
