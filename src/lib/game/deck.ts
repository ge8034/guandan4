import type { Card, Suit } from './types';

/** 每副牌包含的花色（不含王牌） */
const SUITS: Suit[] = ['spade', 'heart', 'club', 'diamond'];

/** 点数牌 rank→value 和展示名 */
interface RankDef {
  rank: string;
  value: number;
}

const NUMBER_RANKS: RankDef[] = [
  { rank: '2', value: 2 },
  { rank: '3', value: 3 },
  { rank: '4', value: 4 },
  { rank: '5', value: 5 },
  { rank: '6', value: 6 },
  { rank: '7', value: 7 },
  { rank: '8', value: 8 },
  { rank: '9', value: 9 },
  { rank: '10', value: 10 },
  { rank: 'J', value: 11 },
  { rank: 'Q', value: 12 },
  { rank: 'K', value: 13 },
  { rank: 'A', value: 14 },
];

/**
 * 生成一副标准 54 张牌（4花色×13点数 + 小王 + 大王）。
 */
function createOneDeck(): Card[] {
  const deck: Card[] = [];

  for (const suit of SUITS) {
    for (const { rank, value } of NUMBER_RANKS) {
      deck.push({ suit, rank, value });
    }
  }

  deck.push({ suit: 'joker', rank: 'SJOKER', value: 100 });
  deck.push({ suit: 'joker', rank: 'JOKER', value: 200 });

  return deck;
}

/**
 * 生成 108 张牌（2 副标准 54 张牌）。
 */
export function createDeck(): Card[] {
  return [...createOneDeck(), ...createOneDeck()];
}

/**
 * Fisher-Yates 洗牌算法，返回新数组。
 */
export function shuffle(deck: Card[]): Card[] {
  const result = [...deck];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 手牌排序：按点数降序（大王 200 > 小王 100 > A 14 > ... > 2）。
 */
export function sortHands(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => b.value - a.value);
}

/**
 * 将牌组均匀发给 4 人，每人 27 张，返回已排序的 4 份手牌。
 */
export function deal(deck: Card[]): Card[][] {
  const hands: Card[][] = [[], [], [], []];

  for (let i = 0; i < deck.length; i++) {
    hands[i % 4].push(deck[i]);
  }

  return hands.map(sortHands);
}
