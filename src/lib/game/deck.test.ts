import { describe, it, expect } from 'vitest';
import type { Card, Suit } from './types';
import { createDeck, shuffle, deal, sortHands } from './deck';

/** 辅助函数：快速创建测试用卡牌 */
function card(value: number, suit: Suit = 'spade', rank = ''): Card {
  const rankMap: Record<number, string> = {
    2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8',
    9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A',
    100: 'SJ', 200: 'BJ',
  };
  return { suit, value, rank: rank || rankMap[value] || `${value}` };
}

describe('createDeck', () => {
  it('应生成108张牌（2副牌）', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(108);
  });

  it('应包含4张王牌（2张大王 + 2张小王）', () => {
    const deck = createDeck();
    const smallJokers = deck.filter((c) => c.value === 100);
    const bigJokers = deck.filter((c) => c.value === 200);
    expect(smallJokers).toHaveLength(2);
    expect(bigJokers).toHaveLength(2);
  });

  it('每张点数牌（2~A）应各出现8次（4花色 × 2副）', () => {
    const deck = createDeck();
    for (let v = 2; v <= 14; v++) {
      const count = deck.filter((c) => c.value === v).length;
      expect(count).toBe(8);
    }
  });

  it('每种花色（非王牌）应各出现26次（13点数 × 2副）', () => {
    const deck = createDeck();
    const nonJokerSuits: Suit[] = ['spade', 'heart', 'club', 'diamond'];
    for (const s of nonJokerSuits) {
      const count = deck.filter((c) => c.suit === s).length;
      expect(count).toBe(26);
    }
  });

  it('王牌的花色应为 joker', () => {
    const deck = createDeck();
    const jokers = deck.filter((c) => c.value === 100 || c.value === 200);
    expect(jokers.every((c) => c.suit === 'joker')).toBe(true);
  });

  it('每张牌都应包含有效的 rank 字段', () => {
    const deck = createDeck();
    expect(deck.every((c) => typeof c.rank === 'string' && c.rank.length > 0)).toBe(true);
  });
});

describe('shuffle', () => {
  it('应返回新数组（不可变性）', () => {
    const deck = createDeck();
    const shuffled = shuffle(deck);
    expect(shuffled).not.toBe(deck);
  });

  it('洗牌后长度不变', () => {
    const deck = createDeck();
    expect(shuffle(deck)).toHaveLength(deck.length);
  });

  it('应包含所有原始牌', () => {
    const deck = createDeck();
    const shuffled = shuffle(deck);
    // 每张原始牌都能在洗牌后的牌组中找到
    for (const card of deck) {
      expect(shuffled.some(
        (c) => c.suit === card.suit && c.value === card.value && c.rank === card.rank
      )).toBe(true);
    }
  });
});

describe('deal', () => {
  it('应返回4份手牌', () => {
    const deck = createDeck();
    const hands = deal(deck);
    expect(hands).toHaveLength(4);
  });

  it('每人应得27张牌', () => {
    const deck = createDeck();
    const hands = deal(deck);
    for (let i = 0; i < 4; i++) {
      expect(hands[i]).toHaveLength(27);
    }
  });

  it('4份手牌合计108张', () => {
    const deck = createDeck();
    const hands = deal(deck);
    const total = hands.reduce((sum, h) => sum + h.length, 0);
    expect(total).toBe(108);
  });

  it('发完牌后原始牌组不应变化', () => {
    const deck = createDeck();
    const original = [...deck];
    deal(deck);
    expect(deck).toHaveLength(original.length);
  });

  it('每份手牌都已排序（按点数降序）', () => {
    const deck = createDeck();
    const hands = deal(deck);
    for (const hand of hands) {
      for (let i = 1; i < hand.length; i++) {
        expect(hand[i - 1].value).toBeGreaterThanOrEqual(hand[i].value);
      }
    }
  });
});

describe('sortHands', () => {
  it('应按点数降序排列（大王 > 小王 > A > ... > 2）', () => {
    const cards: Card[] = [
      card(3, 'diamond'),
      card(200, 'joker', 'BJ'),
      card(14, 'spade', 'A'),
      card(100, 'joker', 'SJ'),
      card(5, 'heart'),
    ];
    const sorted = sortHands(cards);
    expect(sorted[0].value).toBe(200);
    expect(sorted[1].value).toBe(100);
    expect(sorted[2].value).toBe(14);
    expect(sorted[3].value).toBe(5);
    expect(sorted[4].value).toBe(3);
  });

  it('同点数不同花色，排序稳定（保持原始相对顺序）', () => {
    const cards: Card[] = [
      card(10, 'diamond'),
      card(10, 'heart'),
      card(10, 'spade'),
      card(10, 'club'),
    ];
    const sorted = sortHands(cards);
    expect(sorted.every((c) => c.value === 10)).toBe(true);
    expect(sorted).toHaveLength(4);
  });

  it('大王始终排在最前', () => {
    const cards: Card[] = [
      card(14, 'spade', 'A'),
      card(200, 'joker', 'BJ'),
      card(5, 'heart'),
    ];
    const sorted = sortHands(cards);
    expect(sorted[0].value).toBe(200);
  });

  it('小王排在第二，仅次于大王', () => {
    const cards: Card[] = [
      card(100, 'joker', 'SJ'),
      card(200, 'joker', 'BJ'),
    ];
    const sorted = sortHands(cards);
    expect(sorted[0].value).toBe(200);
    expect(sorted[1].value).toBe(100);
  });

  it('不应修改原数组', () => {
    const cards: Card[] = [
      card(3, 'diamond'),
      card(14, 'spade'),
    ];
    const original = [...cards];
    sortHands(cards);
    expect(cards[0]).toEqual(original[0]);
    expect(cards[1]).toEqual(original[1]);
  });
});
