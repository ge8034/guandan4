import { describe, it, expect } from 'vitest';
import type { Card } from './types';
import {
  determineTributePairs,
  canResistTribute,
  getTributeCard,
  getReturnCard,
  TributePair,
} from './tribute';

/** 辅助函数：快速创建测试用卡牌 */
function card(value: number, suit: Card['suit'] = 'spade', rank = ''): Card {
  // 为方便测试，rank 自动生成
  const rankMap: Record<number, string> = {
    2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8',
    9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A',
    100: 'SJ', 200: 'BJ',
  };
  return { suit, value, rank: rank || rankMap[value] || `${value}` };
}

describe('determineTributePairs', () => {
  it('头游和二游不同队时，末游向头游单贡', () => {
    // rankings[0]=0(头游,队A), rankings[1]=1(二游,队B), 不同队 -> 单贡
    // 末游(3) -> 头游(0)
    const result = determineTributePairs([0, 1, 2, 3]);
    expect(result).toEqual<TributePair[]>([{ from: 3, to: 0 }]);
  });

  it('头游和二游同队时，双贡：末游→头游, 三游→二游', () => {
    // rankings[0]=0(头游,队A), rankings[1]=2(二游,队A), 同队 -> 双贡
    // 末游(3) -> 头游(0), 三游(1) -> 二游(2)
    const result = determineTributePairs([0, 2, 1, 3]);
    expect(result).toEqual<TributePair[]>([
      { from: 3, to: 0 },
      { from: 1, to: 2 },
    ]);
  });

  it('头游和二游不同队的另一组排列（队B在头二）', () => {
    // 头游=1(队B), 二游=3(队B), 同队 -> 双贡
    const result = determineTributePairs([1, 3, 0, 2]);
    expect(result).toEqual<TributePair[]>([
      { from: 2, to: 1 },
      { from: 0, to: 3 },
    ]);
  });
});

describe('canResistTribute', () => {
  it('持有两张大王（value=200）时可以抗贡', () => {
    const hand: Card[] = [
      card(200, 'joker', 'BJ'),
      card(200, 'joker', 'BJ'),
      card(14, 'heart'),
    ];
    expect(canResistTribute(hand)).toBe(true);
  });

  it('只持有一张大王时不能抗贡', () => {
    const hand: Card[] = [
      card(200, 'joker', 'BJ'),
      card(14, 'heart'),
    ];
    expect(canResistTribute(hand)).toBe(false);
  });

  it('没有大王时不能抗贡', () => {
    const hand: Card[] = [
      card(14, 'heart'),
      card(13, 'spade'),
    ];
    expect(canResistTribute(hand)).toBe(false);
  });

  it('拥两张大王但混有其他牌也能抗贡', () => {
    const hand: Card[] = [
      card(200, 'joker', 'BJ'),
      card(200, 'joker', 'BJ'),
      card(10, 'club'),
      card(5, 'diamond'),
    ];
    expect(canResistTribute(hand)).toBe(true);
  });
});

describe('getTributeCard', () => {
  it('返回手中最大牌（value>=10）', () => {
    const hand: Card[] = [
      card(5, 'heart'),
      card(10, 'spade'),
      card(13, 'diamond'),
    ];
    const result = getTributeCard(hand);
    expect(result).not.toBeNull();
    expect(result!.value).toBe(13);
    expect(result!.suit).toBe('diamond');
  });

  it('多张相同最大值，返回其中一张', () => {
    const hand: Card[] = [
      card(14, 'heart'),
      card(14, 'spade'),
      card(10, 'club'),
    ];
    const result = getTributeCard(hand);
    expect(result).not.toBeNull();
    expect(result!.value).toBe(14);
  });

  it('所有牌都<10时返回null', () => {
    const hand: Card[] = [
      card(2, 'heart'),
      card(5, 'diamond'),
      card(9, 'club'),
    ];
    expect(getTributeCard(hand)).toBeNull();
  });

  it('空手牌返回null', () => {
    expect(getTributeCard([])).toBeNull();
  });
});

describe('getReturnCard', () => {
  it('返回一张value<10的牌', () => {
    const hand: Card[] = [
      card(14, 'heart'),
      card(5, 'spade'),
      card(13, 'club'),
    ];
    const result = getReturnCard(hand);
    expect(result).not.toBeNull();
    expect(result!.value).toBeLessThan(10);
  });

  it('优先返回较小的牌', () => {
    const hand: Card[] = [
      card(14, 'heart'),
      card(8, 'spade'),
      card(3, 'club'),
      card(6, 'diamond'),
    ];
    const result = getReturnCard(hand);
    expect(result).not.toBeNull();
    // value<10 且应当是其中最小的一张
    expect(result!.value).toBeLessThan(10);
    expect(result!.value).toBe(3); // 最小
  });

  it('没有小于10的牌时返回null', () => {
    const hand: Card[] = [
      card(14, 'heart'),
      card(11, 'spade'),
      card(10, 'club'),
    ];
    expect(getReturnCard(hand)).toBeNull();
  });

  it('空手牌返回null', () => {
    expect(getReturnCard([])).toBeNull();
  });

  it('所有牌>=10 → 返回null', () => {
    const hand: Card[] = [card(14), card(13), card(11), card(10)];
    expect(getReturnCard(hand)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 边界情况补充
// ---------------------------------------------------------------------------
describe('进贡边界', () => {
  it('进贡：手中最大牌<10 → 返回null', () => {
    const hand: Card[] = [card(3), card(5), card(7), card(9)];
    expect(getTributeCard(hand)).toBeNull();
  });

  it('进贡：选最大的牌(>=10)', () => {
    const hand: Card[] = [card(12), card(14), card(10), card(7)];
    const result = getTributeCard(hand);
    expect(result).not.toBeNull();
    expect(result!.value).toBe(14);
  });

  it('抗贡：1张大王 → false', () => {
    const hand: Card[] = [card(200, 'joker')];
    expect(canResistTribute(hand)).toBe(false);
  });

  it('抗贡：2张大王 → true', () => {
    const hand: Card[] = [card(200, 'joker'), card(200, 'joker')];
    expect(canResistTribute(hand)).toBe(true);
  });

  it('还贡：选最小的牌(<10)', () => {
    const hand: Card[] = [card(7), card(3), card(5), card(12)];
    const result = getReturnCard(hand);
    expect(result).not.toBeNull();
    expect(result!.value).toBe(3);
  });

  it('双贡：头游二游同队', () => {
    const pairs = determineTributePairs([0, 2, 1, 3]);
    expect(pairs).toHaveLength(2);
    expect(pairs[0].from).toBe(3); // 末→头
    expect(pairs[0].to).toBe(0);
    expect(pairs[1].from).toBe(1); // 三→二
    expect(pairs[1].to).toBe(2);
  });

  it('单贡：头游二游不同队', () => {
    const pairs = determineTributePairs([0, 1, 2, 3]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0].from).toBe(3); // 末→头
    expect(pairs[0].to).toBe(0);
  });
});

describe('进贡边缘情况', () => {
  it('手中最大牌<10时getTributeCard返回null', () => {
    const hand: Card[] = [
      card(2, 'heart'),
      card(5, 'diamond'),
      card(9, 'club'),
      card(3, 'spade'),
    ];
    expect(getTributeCard(hand)).toBeNull();
  });

  it('手中所有牌均>=10时getReturnCard返回null', () => {
    const hand: Card[] = [
      card(14, 'heart'),
      card(11, 'spade'),
      card(10, 'club'),
      card(13, 'diamond'),
    ];
    expect(getReturnCard(hand)).toBeNull();
  });

  it('进贡牌含大王时返回大王', () => {
    const hand: Card[] = [
      card(200, 'joker', 'BJ'),
      card(14, 'heart'),
      card(13, 'spade'),
      card(10, 'club'),
    ];
    const result = getTributeCard(hand);
    expect(result).not.toBeNull();
    expect(result!.value).toBe(200);
  });

  it('进贡牌含逢人配和大牌时返回分值最大的', () => {
    const hand: Card[] = [
      card(5, 'heart'), // 逢人配
      card(14, 'spade'),
      card(13, 'diamond'),
    ];
    const result = getTributeCard(hand);
    expect(result).not.toBeNull();
    expect(result!.value).toBe(14);
  });

  it('还贡牌优先返回手中最小的（<10）', () => {
    const hand: Card[] = [
      card(14, 'heart'),
      card(5, 'spade'),
      card(8, 'club'),
      card(2, 'diamond'),
      card(9, 'heart'),
    ];
    const result = getReturnCard(hand);
    expect(result).not.toBeNull();
    expect(result!.value).toBe(2);
  });
});

describe('抗贡后出牌场景', () => {
  it('持有两张大王可抗贡', () => {
    const hand: Card[] = [
      card(200, 'joker', 'BJ'),
      card(200, 'joker', 'BJ'),
      card(14, 'heart'),
    ];
    expect(canResistTribute(hand)).toBe(true);
  });

  it('只有一张大王不能抗贡', () => {
    const hand: Card[] = [
      card(200, 'joker', 'BJ'),
      card(100, 'joker', 'SJ'),
      card(14, 'heart'),
    ];
    expect(canResistTribute(hand)).toBe(false);
  });

  it('抗贡后正常出牌（从27张正常手牌开始）', () => {
    // 模拟抗贡成功后的场景：手牌按正常顺序出
    const hand: Card[] = [
      card(200, 'joker', 'BJ'),
      card(200, 'joker', 'BJ'),
      card(14, 'heart'),
      card(13, 'spade'),
      card(10, 'club'),
      card(8, 'diamond'),
      card(5, 'heart'),
      card(5, 'spade'),
      card(3, 'club'),
    ];
    // 抗贡判定
    expect(canResistTribute(hand)).toBe(true);
    // 进贡牌仍然可用（未进贡）
    const tributeCard = getTributeCard(hand);
    expect(tributeCard).not.toBeNull();
    // 还贡不需要执行
    const returnCard = getReturnCard(hand);
    expect(returnCard).not.toBeNull();
  });
});

describe('双贡+抗贡混合', () => {
  it('双贡场景：头二同队 → 两个进贡对', () => {
    const pairs = determineTributePairs([0, 2, 1, 3]);
    expect(pairs).toHaveLength(2);
    expect(pairs).toContainEqual({ from: 3, to: 0 });
    expect(pairs).toContainEqual({ from: 1, to: 2 });
  });

  it('单贡场景：头二不同队 → 一个进贡对', () => {
    const pairs = determineTributePairs([0, 1, 2, 3]);
    expect(pairs).toHaveLength(1);
    expect(pairs).toContainEqual({ from: 3, to: 0 });
  });

  it('头二同队（交替排列）→ 双贡', () => {
    // 头游0(队A), 二游2(队A), 三游1(队B), 末游3(队B)
    // 应: 末游3→头游0, 三游1→二游2
    const pairs = determineTributePairs([0, 2, 1, 3]);
    expect(pairs).toHaveLength(2);
  });

  it('末游有两大王可抗贡但不影响进贡关系判定', () => {
    // 即使末游抗贡，determineTributePairs仍正常返回
    const pairs = determineTributePairs([3, 1, 0, 2]);
    expect(pairs.length).toBeGreaterThanOrEqual(1);
  });

  it('头游和末游同队双进贡关系', () => {
    // 头游=0(队A), 二游=2(队A), 三游=3(队B), 末游=1(队B)
    const pairs = determineTributePairs([0, 2, 3, 1]);
    expect(pairs).toEqual([
      { from: 1, to: 0 },
      { from: 3, to: 2 },
    ]);
  });
});

describe('进贡还贡完整流程', () => {
  it('进贡方拔最大牌>=10 → 收贡方还一张<10的牌', () => {
    const fromHand: Card[] = [
      card(14, 'heart'),
      card(13, 'spade'),
      card(10, 'club'),
      card(8, 'diamond'),
      card(5, 'spade'),
    ];
    const toHand: Card[] = [
      card(12, 'club'),
      card(11, 'diamond'),
      card(9, 'heart'),
      card(7, 'spade'),
      card(3, 'club'),
    ];

    const tributeCard = getTributeCard(fromHand);
    const returnCard = getReturnCard(toHand);

    expect(tributeCard).not.toBeNull();
    expect(tributeCard!.value).toBeGreaterThanOrEqual(10);
    expect(returnCard).not.toBeNull();
    expect(returnCard!.value).toBeLessThan(10);
  });

  it('还贡牌是收贡方手中最小的牌', () => {
    const toHand: Card[] = [
      card(14, 'heart'),
      card(9, 'club'),
      card(8, 'diamond'),
      card(4, 'spade'),
      card(2, 'club'),
    ];
    const returnCard = getReturnCard(toHand);
    expect(returnCard).not.toBeNull();
    expect(returnCard!.value).toBe(2);
  });
});
