import type { Card } from './types';

/** 进贡关系对：from 向 to 进贡 */
export interface TributePair {
  from: number;
  to: number;
}

/**
 * 判定进贡关系
 * 头游和二游同队 -> 双贡（末游→头游，三游→二游）
 * 头游和二游不同队 -> 单贡（末游→头游）
 */
export function determineTributePairs(rankings: number[]): TributePair[] {
  const head = rankings[0];
  const second = rankings[1];
  const third = rankings[2];
  const last = rankings[3];
  const sameTeam = (a: number, b: number): boolean => (a % 2) === (b % 2);

  if (sameTeam(head, second)) {
    return [
      { from: last, to: head },
      { from: third, to: second },
    ];
  }
  return [{ from: last, to: head }];
}

/**
 * 判断是否持有两张大王（抗贡）
 * 以 value 200 表示大王
 */
export function canResistTribute(hand: Card[]): boolean {
  const BIG_JOKER_VALUE = 200;
  let count = 0;
  for (const card of hand) {
    if (card.value === BIG_JOKER_VALUE) {
      count++;
    }
  }
  return count >= 2;
}

/**
 * 获取进贡牌：优先选孤立大牌，不拆对子/三同。
 * 无符合条件的牌返回 null
 */
export function getTributeCard(hand: Card[]): Card | null {
  if (hand.length === 0) return null;

  // 统计各点数的张数
  const count = new Map<number, number>();
  for (const c of hand) count.set(c.value, (count.get(c.value) || 0) + 1);

  // 优先选孤立大牌（只有1张的 value >= 10）
  let best: Card | null = null;
  for (const c of hand) {
    if (c.value < 10) continue;
    const cnt = count.get(c.value) || 0;
    if (cnt === 1 && (!best || c.value > best.value)) best = c;
  }

  // 没有孤立大牌时选最大的（哪怕拆对子）
  if (!best) {
    for (const c of hand) {
      if (c.value >= 10 && (!best || c.value > best.value)) best = c;
    }
  }
  return best;
}

/**
 * 获取一张 value < 10 的牌用于还贡
 * 优先返回较小的牌
 */
export function getReturnCard(hand: Card[]): Card | null {
  let minCard: Card | null = null;
  for (const card of hand) {
    if (card.value < 10) {
      if (minCard === null || card.value < minCard.value) {
        minCard = card;
      }
    }
  }
  return minCard;
}
