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

describe('顺子含逢人配的各种组合', () => {
  const level = 5;

  it('4普通+1逢人配补齐顺子', () => {
    const cards = [c(3, 'spade'), c(4, 'spade'), c(5, 'spade'), c(6, 'spade'), c(5, 'heart')];
    const r = classifyHand(cards, level);
    expect(r).not.toBeNull();
    expect(r!.type).toBe('straight');
  });

  it('3普通+2逢人配补齐顺子', () => {
    const cards = [c(3, 'spade'), c(4, 'spade'), c(5, 'spade'), c(5, 'heart'), c(5, 'heart')];
    const r = classifyHand(cards, level);
    expect(r).not.toBeNull();
    expect(r!.type).toBe('straight');
  });

  it('不同花色的普通牌无法组成顺子', () => {
    const cards = [c(3, 'spade'), c(4, 'heart'), c(5, 'spade'), c(6, 'club'), c(7, 'diamond')];
    const r = classifyHand(cards, level);
    expect(r).toBeNull();
  });

  it('顺子有重复面值无效', () => {
    const cards = [c(3, 'spade'), c(3, 'heart'), c(4, 'spade'), c(5, 'spade'), c(6, 'spade')];
    const r = classifyHand(cards, level);
    expect(r).toBeNull();
  });

  it('顺子含逢人配但缺口过大无法补齐', () => {
    const cards = [c(3, 'spade'), c(5, 'spade'), c(7, 'spade'), c(9, 'spade'), c(5, 'heart')];
    const r = classifyHand(cards, level);
    expect(r).toBeNull();
  });

  it('10JQKA顺子最高分为A', () => {
    const cards = [c(10, 'spade'), c(11, 'spade'), c(12, 'spade'), c(13, 'spade'), c(14, 'spade')];
    const r = classifyHand(cards, level);
    expect(r).not.toBeNull();
    expect(r!.type).toBe('straight');
    expect(r!.score).toBe(14);
  });
});

describe('连对含逢人配的各种组合', () => {
  const level = 5;

  it('5普通+1逢人配补齐连对', () => {
    const cards = [c(3, 'spade'), c(3, 'club'), c(4, 'spade'), c(5, 'spade'), c(5, 'club'), c(5, 'heart')];
    const r = classifyHand(cards, level);
    expect(r).not.toBeNull();
    expect(r!.type).toBe('sequence_pairs');
  });

  it('4普通+2逢人配补齐连对', () => {
    const cards = [c(3, 'spade'), c(3, 'club'), c(4, 'spade'), c(4, 'club'), c(5, 'heart'), c(5, 'heart')];
    const r = classifyHand(cards, level);
    expect(r).not.toBeNull();
    expect(r!.type).toBe('sequence_pairs');
  });

  it('3普通+3逢人配补齐连对', () => {
    const cards = [c(3, 'spade'), c(3, 'club'), c(4, 'spade'), c(5, 'heart'), c(5, 'heart'), c(5, 'heart')];
    const r = classifyHand(cards, level);
    expect(r).not.toBeNull();
    expect(r!.type).toBe('sequence_pairs');
  });

  it('连对某一组超过2张无效', () => {
    const cards = [c(3, 'spade'), c(3, 'club'), c(3, 'heart'), c(4, 'spade'), c(4, 'club'), c(5, 'spade')];
    const r = classifyHand(cards, level);
    expect(r).toBeNull();
  });

  it('连对不连续返回null', () => {
    const cards = [c(3, 'spade'), c(3, 'club'), c(5, 'spade'), c(5, 'club'), c(7, 'spade'), c(7, 'club')];
    const r = classifyHand(cards, level);
    expect(r).toBeNull();
  });
});

describe('钢板含逢人配的各种组合', () => {
  const level = 5;

  it('5普通+1逢人配补齐钢板', () => {
    const cards = [c(3, 'spade'), c(3, 'club'), c(3, 'heart'), c(4, 'spade'), c(4, 'club'), c(5, 'heart')];
    const r = classifyHand(cards, level);
    expect(r).not.toBeNull();
    expect(r!.type).toBe('sequence_triples');
  });

  it('4普通+2逢人配补齐钢板', () => {
    const cards = [c(3, 'spade'), c(3, 'club'), c(3, 'heart'), c(4, 'spade'), c(5, 'heart'), c(5, 'heart')];
    const r = classifyHand(cards, level);
    expect(r).not.toBeNull();
    expect(r!.type).toBe('sequence_triples');
  });

  it('3普通+3逢人配补齐钢板（有组超2张避开连对）', () => {
    const cards = [c(3, 'spade'), c(3, 'club'), c(3, 'heart'), c(4, 'spade'), c(4, 'club'), c(5, 'heart')];
    const r = classifyHand(cards, level);
    expect(r).not.toBeNull();
    expect(r!.type).toBe('sequence_triples');
  });

  it('钢板不连续返回null', () => {
    const cards = [c(3, 'spade'), c(3, 'club'), c(3, 'heart'), c(5, 'spade'), c(5, 'club'), c(5, 'heart')];
    const r = classifyHand(cards, level);
    expect(r).toBeNull();
  });

  it('钢板有一组超过3张无效', () => {
    const cards = [c(3, 'spade'), c(3, 'club'), c(3, 'heart'), c(3, 'diamond'), c(4, 'spade'), c(4, 'club')];
    const r = classifyHand(cards, level);
    expect(r).toBeNull();
  });
});

describe('7张和8张炸弹', () => {
  const level = 5;

  it('7张同值炸弹', () => {
    const cards = [
      c(8, 'spade'), c(8, 'heart'), c(8, 'club'), c(8, 'diamond'),
      c(8, 'spade'), c(8, 'heart'), c(8, 'club'),
    ];
    const r = classifyHand(cards, level);
    expect(r).not.toBeNull();
    expect(r!.type).toBe('bomb');
    expect(r!.cards.length).toBe(7);
  });

  it('6普通+1逢人配=7张炸弹', () => {
    const cards = [
      c(8, 'spade'), c(8, 'heart'), c(8, 'club'), c(8, 'diamond'),
      c(8, 'spade'), c(8, 'heart'),
      c(5, 'heart'),
    ];
    const r = classifyHand(cards, level);
    expect(r).not.toBeNull();
    expect(r!.type).toBe('bomb');
    expect(r!.cards.length).toBe(7);
  });

  it('7张炸弹比6张炸弹大', () => {
    const bomb7 = [
      c(3, 'spade'), c(3, 'heart'), c(3, 'club'), c(3, 'diamond'),
      c(3, 'spade'), c(3, 'heart'), c(3, 'club'),
    ];
    const bomb6 = [
      c(8, 'spade'), c(8, 'heart'), c(8, 'club'), c(8, 'diamond'),
      c(8, 'spade'), c(8, 'heart'),
    ];
    expect(compareHands(bomb7, bomb6, level)).toBe(1);
  });

  it('6张级牌炸弹比6张普通炸弹大', () => {
    const levelBomb = [
      c(5, 'spade'), c(5, 'club'), c(5, 'diamond'),
      c(5, 'spade'), c(5, 'club'), c(5, 'diamond'),
    ];
    const normalBomb = [
      c(3, 'spade'), c(3, 'heart'), c(3, 'club'), c(3, 'diamond'),
      c(3, 'spade'), c(3, 'heart'),
    ];
    expect(compareHands(levelBomb, normalBomb, level)).toBe(1);
  });
});

describe('classifyHand 五张六张非匹配返回null', () => {
  const level = 5;

  it('5张无法组成三带二或顺子时返回null', () => {
    const cards = [c(3, 'spade'), c(3, 'club'), c(5, 'spade'), c(7, 'spade'), c(9, 'spade')];
    const r = classifyHand(cards, level);
    expect(r).toBeNull();
  });

  it('6张不连续对子和三同张返回null', () => {
    const cards = [c(3, 'spade'), c(3, 'club'), c(5, 'spade'), c(5, 'club'), c(7, 'spade'), c(7, 'club')];
    const r = classifyHand(cards, level);
    expect(r).toBeNull();
  });

  it('5张含王非火箭返回null', () => {
    const cards = [c(200, 'joker'), c(3, 'spade'), c(4, 'spade'), c(5, 'spade'), c(6, 'spade')];
    const r = classifyHand(cards, level);
    expect(r).toBeNull();
  });

  it('4张王但大小王配比不对返回null', () => {
    const cards = [c(200, 'joker'), c(100, 'joker'), c(100, 'joker'), c(100, 'joker')];
    const r = classifyHand(cards, level);
    expect(r).toBeNull();
  });
});

describe('tryStraight 无匹配返回null', () => {
  const level = 5;

  it('间隔太大无法组成顺子', () => {
    const cards = [c(3, 'spade'), c(5, 'spade'), c(7, 'spade'), c(9, 'spade'), c(11, 'spade')];
    const r = classifyHand(cards, level);
    expect(r).toBeNull();
  });

  it('跨度超过4无法组成顺子', () => {
    const cards = [c(2, 'spade'), c(3, 'spade'), c(4, 'spade'), c(5, 'spade'), c(8, 'spade')];
    const r = classifyHand(cards, level);
    expect(r).toBeNull();
  });
});

describe('tryTriplePair 分支覆盖', () => {
  const level = 5;

  it('两值组v2凑triple v1凑pair（逢人配全补入v1）', () => {
    const cards = [c(3, 'spade'), c(8, 'spade'), c(8, 'heart'), c(8, 'club'), c(5, 'heart')];
    const r = classifyHand(cards, level);
    expect(r).not.toBeNull();
    expect(r!.type).toBe('triple_pair');
  });

  it('1普通+4逢人配优先判定为炸弹', () => {
    const cards = [c(8, 'spade'), c(5, 'heart'), c(5, 'heart'), c(5, 'heart'), c(5, 'heart')];
    const r = classifyHand(cards, level);
    expect(r).not.toBeNull();
    expect(r!.type).toBe('bomb');
  });
});

describe('classifyTriple 全部分支', () => {
  const level = 5;

  it('1张普通牌+2张逢人配组成三同张', () => {
    const cards = [c(8, 'spade'), c(5, 'heart'), c(5, 'heart')];
    const r = classifyHand(cards, level);
    expect(r).not.toBeNull();
    expect(r!.type).toBe('triple');
    expect(r!.score).toBe(8);
  });

  it('0张普通牌+3张逢人配组成三同张', () => {
    const cards = [c(5, 'heart'), c(5, 'heart'), c(5, 'heart')];
    const r = classifyHand(cards, level);
    expect(r).not.toBeNull();
    expect(r!.type).toBe('triple');
    expect(r!.score).toBe(50);
  });

  it('2张不同值普通牌+1张逢人配无法组成三同张', () => {
    const cards = [c(8, 'spade'), c(9, 'heart'), c(5, 'heart')];
    const r = classifyHand(cards, level);
    expect(r).toBeNull();
  });
});

describe('classifyPair 全部分支', () => {
  const level = 5;

  it('0张普通牌+2张逢人配组成对子', () => {
    const cards = [c(5, 'heart'), c(5, 'heart')];
    const r = classifyHand(cards, level);
    expect(r).not.toBeNull();
    expect(r!.type).toBe('pair');
    expect(r!.score).toBe(50);
  });

  it('1张普通牌+1张逢人配组成对子', () => {
    const cards = [c(8, 'spade'), c(5, 'heart')];
    const r = classifyHand(cards, level);
    expect(r).not.toBeNull();
    expect(r!.type).toBe('pair');
    expect(r!.score).toBe(8);
  });
});

describe('isBomb 扩展', () => {
  it('6张同值非炸弹（需要>=4）', () => {
    expect(isBomb([c(8), c(8), c(8), c(8), c(8), c(8)], 5)).toBe(true);
  });

  it('3张普通+1逢人配=4张炸弹', () => {
    expect(isBomb([c(8), c(8), c(8), c(5, 'heart')], 5)).toBe(true);
  });

  it('2张普通+2逢人配=4张炸弹', () => {
    expect(isBomb([c(8), c(8), c(5, 'heart'), c(5, 'heart')], 5)).toBe(true);
  });
});

describe('classifyHand 更多边界', () => {
  const level = 5;

  it('7张非同值非炸弹返回null', () => {
    const cards = [
      c(3, 'spade'), c(3, 'club'), c(3, 'heart'), c(3, 'diamond'),
      c(4, 'spade'), c(4, 'club'), c(4, 'heart'),
    ];
    const r = classifyHand(cards, level);
    expect(r).toBeNull();
  });

  it('4张非炸弹不含王非火箭返回null', () => {
    const cards = [c(3, 'spade'), c(4, 'spade'), c(5, 'spade'), c(6, 'spade')];
    const r = classifyHand(cards, level);
    expect(r).toBeNull();
  });

  it('compareHands 同牌型同分值返回0', () => {
    const a = [c(14)];
    const b = [c(14)];
    expect(compareHands(a, b, level)).toBe(0);
  });

  it('compareHands 两个火箭返回0', () => {
    const r1 = [c(200, 'joker'), c(200, 'joker'), c(100, 'joker'), c(100, 'joker')];
    const r2 = [c(200, 'joker'), c(200, 'joker'), c(100, 'joker'), c(100, 'joker')];
    expect(compareHands(r1, r2, level)).toBe(0);
  });

  it('空手牌compare返回0', () => {
    expect(compareHands([], [], level)).toBe(0);
  });

  it('effectiveRankFromGroup 未定义组返回50', () => {
    // 3张2在级牌=2时全是逢人配, classifyTriple 会处理
    const cards = [c(2), c(2), c(2)];
    const result = classifyHand(cards, 2);
    expect(result).not.toBeNull();
  });

  it('classifyTriplePair groups.size=1 但无效组合返回 null', () => {
    // 5张同值牌不是三带二, 应被识别为炸弹而不是 triple_pair
    const cards = [c(8), c(8), c(8), c(8), c(8)];
    const result = classifyHand(cards, 3);
    expect(result?.type).toBe('bomb');
  });

  it('tryStraight 无法组成顺子返回 null', () => {
    // 5张牌差值不连续 → 非顺子, 非炸弹, 非三带二 → classifyFive 返回 null
    const cards = [c(3), c(5), c(7), c(9), c(11)];
    const result = classifyHand(cards, 5);
    expect(result).toBeNull();
  });

  it('triple_pair 识别', () => {
    // 33344 → 标准三带二 (非炸弹, 不含逢人配)
    const cards = [c(3), c(3), c(3), c(4), c(4)];
    const result = classifyHand(cards, 5);
    expect(result?.type).toBe('triple_pair');
  });

  it('有效顺子包含逢人配', () => {
    // 4-5-6-7 (全黑桃) + 逢人配(红心2, 级牌=2) → 补成 4-5-6-7-8 顺子
    const cards = [c(4), c(5), c(6), c(7), c(2, 'heart')];
    const result = classifyHand(cards, 2);
    expect(result?.type).toBe('straight');
  });

  it('bomb 识别跨级牌值', () => {
    // 4张5是炸弹, 级牌不匹配
    const cards = [c(5), c(5), c(5), c(5)];
    const result = classifyHand(cards, 8);
    expect(result?.type).toBe('bomb');
    expect(result?.score).toBeGreaterThan(0);
  });

  it('rocket 识别', () => {
    const cards = [c(200, 'joker'), c(200, 'joker'), c(100, 'joker'), c(100, 'joker')];
    const result = classifyHand(cards, 2);
    expect(result?.type).toBe('rocket');
  });

  it('isBomb 对非炸弹返回 false', () => {
    const single = [c(3)];
    expect(isBomb(single, 2)).toBe(false);
  });

  it('isRocket 对非火箭返回 false', () => {
    const single = [c(3)];
    expect(isRocket(single)).toBe(false);
  });

  it('序列三同张(钢板)识别', () => {
    // 333444 → sequence_triples
    const cards = [c(3), c(3), c(3), c(4), c(4), c(4)];
    const result = classifyHand(cards, 5);
    expect(result?.type).toBe('sequence_triples');
  });

  it('连对识别', () => {
    // 334455 → sequence_pairs
    const cards = [c(3), c(3), c(4), c(4), c(5), c(5)];
    const result = classifyHand(cards, 5);
    expect(result?.type).toBe('sequence_pairs');
  });
});

