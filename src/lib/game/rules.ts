import type { Card, ClassifiedHand } from './types';

// ---------------------------------------------------------------------------
// 单张牌分值
// ---------------------------------------------------------------------------
export function getCardScore(card: Card, levelRank: number): number {
  // 王
  if (card.suit === 'joker') {
    return card.value; // 大王=200, 小王=100
  }
  // 逢人配（红桃级牌）
  if (card.suit === 'heart' && card.value === levelRank) {
    return 60;
  }
  // 普通级牌
  if (card.value === levelRank) {
    return 50;
  }
  return card.value;
}

// ---------------------------------------------------------------------------
// 类别分组
// ---------------------------------------------------------------------------

/** 将手牌分为：王、逢人配、普通牌 */
function splitCards(cards: Card[], levelRank: number) {
  const jokers: Card[] = [];
  const wilds: Card[] = [];
  const normals: Card[] = [];
  for (const c of cards) {
    if (c.suit === 'joker') {
      jokers.push(c);
    } else if (c.suit === 'heart' && c.value === levelRank) {
      wilds.push(c);
    } else {
      normals.push(c);
    }
  }
  return { jokers, wilds, wildCount: wilds.length, normals };
}

/** 按面值分组 */
function groupByValue(cards: Card[]): Map<number, Card[]> {
  const map = new Map<number, Card[]>();
  for (const c of cards) {
    const g = map.get(c.value) || [];
    g.push(c);
    map.set(c.value, g);
  }
  return map;
}

/**
 * 多张牌的有效rank分值（取最高普通牌的分值；若全是逢人配则返回 50）。
 * 该分值用于非炸弹、非火箭手牌的对比。
 */
function effectiveRankScore(rank: number, levelRank: number): number {
  return rank === levelRank ? 50 : rank;
}

/** 从一组相同面值的牌中提取有效rank */
function effectiveRankFromGroup(group: Card[] | undefined, levelRank: number): number {
  if (!group || group.length === 0) return 50; // 全是逢人配
  return effectiveRankScore(group[0].value, levelRank);
}

// ---------------------------------------------------------------------------
// 牌型识别
// ---------------------------------------------------------------------------

function classifyPass(cards: Card[]): ClassifiedHand {
  return { type: 'pass', cards, score: 0 };
}

function classifySingle(cards: Card[], levelRank: number): ClassifiedHand {
  return { type: 'single', cards, score: getCardScore(cards[0], levelRank) };
}

function classifyPair(
  normals: Card[],
  wildCount: number,
  cards: Card[],
  levelRank: number,
): ClassifiedHand | null {
  if (normals.length === 2 && normals[0].value === normals[1].value) {
    return { type: 'pair', cards, score: getCardScore(normals[0], levelRank) };
  }
  if (normals.length === 1 && wildCount === 1) {
    return { type: 'pair', cards, score: getCardScore(normals[0], levelRank) };
  }
  if (normals.length === 0 && wildCount === 2) {
    // 全是逢人配 → 级牌对
    return { type: 'pair', cards, score: 50 };
  }
  return null;
}

function classifyTriple(
  normals: Card[],
  wildCount: number,
  cards: Card[],
  levelRank: number,
): ClassifiedHand | null {
  if (normals.length === 3 && normals.every(c => c.value === normals[0].value)) {
    return { type: 'triple', cards, score: getCardScore(normals[0], levelRank) };
  }
  if (normals.length === 2 && normals[0].value === normals[1].value && wildCount === 1) {
    return { type: 'triple', cards, score: getCardScore(normals[0], levelRank) };
  }
  if (normals.length === 1 && wildCount === 2) {
    return { type: 'triple', cards, score: getCardScore(normals[0], levelRank) };
  }
  if (normals.length === 0 && wildCount === 3) {
    return { type: 'triple', cards, score: 50 };
  }
  return null;
}

function tryTriplePair(
  normals: Card[],
  wildCount: number,
  cards: Card[],
  levelRank: number,
): ClassifiedHand | null {
  if (normals.length + wildCount !== 5) return null;

  const groups = groupByValue(normals);

  // 若只有一个 value 组
  if (groups.size === 1) {
    const [[value, group]] = [...groups];
    if (group.length === 3 && wildCount === 2) {
      return { type: 'triple_pair', cards, score: getCardScore(group[0], levelRank) };
    }
    if (group.length === 2 && wildCount === 3) {
      // 2 普通 + 3 逢人配 → 2 逢人配补成 triple，剩下 2 逢人配为 pair
      return { type: 'triple_pair', cards, score: getCardScore(group[0], levelRank) };
    }
    return null;
  }

  // 两个不同 value 组
  if (groups.size === 2) {
    const entries = [...groups.entries()];
    const [v1, g1] = entries[0];
    const [v2, g2] = entries[1];

    // 尝试 v1=triple, v2=pair
    {
      const tripleNeeded = Math.max(0, 3 - g1.length);
      // 剩余逢人配（去掉triple需要的）不能为负
      const remWild = wildCount - tripleNeeded;
      const pairNeeded = Math.max(0, 2 - g2.length);
      if (tripleNeeded >= 0 && remWild === pairNeeded && g1.length <= 3 && g2.length <= 2) {
        return { type: 'triple_pair', cards, score: getCardScore(g1[0], levelRank) };
      }
    }
    // 尝试 v2=triple, v1=pair
    {
      const tripleNeeded = Math.max(0, 3 - g2.length);
      const remWild = wildCount - tripleNeeded;
      const pairNeeded = Math.max(0, 2 - g1.length);
      if (tripleNeeded >= 0 && remWild === pairNeeded && g2.length <= 3 && g1.length <= 2) {
        return { type: 'triple_pair', cards, score: getCardScore(g2[0], levelRank) };
      }
    }
  }

  return null;
}

function tryStraight(
  normals: Card[],
  wildCount: number,
  cards: Card[],
  levelRank: number,
): ClassifiedHand | null {
  if (normals.length + wildCount !== 5) return null;

  // 所有普通牌必须同花色
  if (normals.length > 0) {
    const suit = normals[0].suit;
    if (!normals.every(c => c.suit === suit)) return null;
  }
  // 不能有重复面值
  const values = [...new Set(normals.map(c => c.value))].sort((a, b) => a - b);
  if (values.length !== normals.length) return null;

  const minVal = values[0];
  const maxVal = values[values.length - 1];

  // 从高到低尝试连续的5个值，优先匹配高分数
  for (let start = minVal; start >= Math.max(maxVal - 4, 2); start--) {
    if (start + 4 > 14) continue; // 不能超过A
    const expected = Array.from({ length: 5 }, (_, i) => start + i);
    const covered = expected.filter(v => values.includes(v)).length;
    if (covered === normals.length) {
      const high = start + 4;
      return { type: 'straight', cards, score: effectiveRankScore(high, levelRank) };
    }
  }

  return null;
}

function trySequencePairs(
  normals: Card[],
  wildCount: number,
  cards: Card[],
  levelRank: number,
): ClassifiedHand | null {
  if (normals.length + wildCount !== 6) return null;

  const freq = new Map<number, number>();
  for (const c of normals) {
    freq.set(c.value, (freq.get(c.value) || 0) + 1);
  }
  for (const count of freq.values()) {
    if (count > 2) return null;
  }

  const values = [...freq.keys()].sort((a, b) => a - b);
  const minVal = values[0];
  const maxVal = values[values.length - 1];

  for (let start = minVal; start >= Math.max(maxVal - 2, 2); start--) {
    if (start + 2 > 14) continue;
    let needed = 0;
    let ok = true;
    for (let v = start; v <= start + 2; v++) {
      const count = freq.get(v) || 0;
      if (count > 2) { ok = false; break; }
      needed += 2 - count;
    }
    if (!ok) continue;
    if (needed === wildCount) {
      const high = start + 2;
      return { type: 'sequence_pairs', cards, score: effectiveRankScore(high, levelRank) };
    }
  }

  return null;
}

function trySequenceTriples(
  normals: Card[],
  wildCount: number,
  cards: Card[],
  levelRank: number,
): ClassifiedHand | null {
  if (normals.length + wildCount !== 6) return null;

  const freq = new Map<number, number>();
  for (const c of normals) {
    freq.set(c.value, (freq.get(c.value) || 0) + 1);
  }
  for (const count of freq.values()) {
    if (count > 3) return null;
  }

  const values = [...freq.keys()].sort((a, b) => a - b);
  const minVal = values[0];
  const maxVal = values[values.length - 1];

  for (let start = minVal; start >= Math.max(maxVal - 1, 2); start--) {
    if (start + 1 > 14) continue;
    let needed = 0;
    let ok = true;
    for (let v = start; v <= start + 1; v++) {
      const count = freq.get(v) || 0;
      if (count > 3) { ok = false; break; }
      needed += 3 - count;
    }
    if (!ok) continue;
    if (needed === wildCount) {
      const high = start + 1;
      return { type: 'sequence_triples', cards, score: effectiveRankScore(high, levelRank) };
    }
  }

  return null;
}

function classifyFive(
  normals: Card[],
  wildCount: number,
  cards: Card[],
  levelRank: number,
): ClassifiedHand | null {
  // 先试三带二，再试顺子
  return tryTriplePair(normals, wildCount, cards, levelRank)
    ?? tryStraight(normals, wildCount, cards, levelRank);
}

function classifySix(
  normals: Card[],
  wildCount: number,
  cards: Card[],
  levelRank: number,
): ClassifiedHand | null {
  return trySequencePairs(normals, wildCount, cards, levelRank)
    ?? trySequenceTriples(normals, wildCount, cards, levelRank);
}

// ---------------------------------------------------------------------------
// classifyHand — 主入口
// ---------------------------------------------------------------------------
export function classifyHand(cards: Card[], levelRank: number): ClassifiedHand | null {
  if (cards.length === 0) return classifyPass(cards);

  const { jokers, wilds, wildCount, normals } = splitCards(cards, levelRank);

  // 火箭：4张王，2大2小
  if (jokers.length === 4) {
    const bigCount = jokers.filter(c => c.rank === 'JOKER').length;
    if (bigCount === 2) {
      return { type: 'rocket', cards, score: 10000 };
    }
    return null; // 4张王但大小王数量不对
  }

  // 单张（含单张王）
  if (cards.length === 1) return classifySingle(cards, levelRank);

  // 非火箭的多张手牌不能有王
  if (jokers.length > 0) return null;

  // 检查炸弹：所有普通牌必须是同一面值
  if (normals.length > 0) {
    const firstVal = normals[0].value;
    const allSame = normals.every(c => c.value === firstVal);
    if (allSame && normals.length + wildCount >= 4) {
      const isLevelBomb = firstVal === levelRank;
      const bombCardScore = isLevelBomb ? 50 : firstVal;
      const bombBase = isLevelBomb ? 5000 : 1000;
      // score 编码：张数 * 100000 + bombBase + cardScore，保证张数优先
      const score = cards.length * 100000 + bombBase + bombCardScore;
      return { type: 'bomb', cards, score };
    }
  }

  // 按张数分支
  switch (cards.length) {
    case 2: return classifyPair(normals, wildCount, cards, levelRank);
    case 3: return classifyTriple(normals, wildCount, cards, levelRank);
    case 5: return classifyFive(normals, wildCount, cards, levelRank);
    case 6: return classifySix(normals, wildCount, cards, levelRank);
    default: return null; // 4/7/8 张手牌在此只能是炸弹（已检查）或无效
  }
}

// ---------------------------------------------------------------------------
// compareHands — 比较两手牌
// ---------------------------------------------------------------------------
export function compareHands(
  a: Card[],
  b: Card[],
  levelRank: number,
): 1 | -1 | 0 {
  const ca = classifyHand(a, levelRank);
  const cb = classifyHand(b, levelRank);
  if (!ca || !cb) return 0;

  // 火箭逻辑
  if (ca.type === 'rocket' && cb.type === 'rocket') return 0;
  if (ca.type === 'rocket') return 1;
  if (cb.type === 'rocket') return -1;

  // 炸弹逻辑
  if (ca.type === 'bomb' && cb.type === 'bomb') {
    // 先比张数
    if (ca.cards.length !== cb.cards.length) {
      return ca.cards.length > cb.cards.length ? 1 : -1;
    }
    // 同张数比分值
    return ca.score > cb.score ? 1 : ca.score < cb.score ? -1 : 0;
  }

  // 炸弹 vs 非炸弹
  if (ca.type === 'bomb') return 1;
  if (cb.type === 'bomb') return -1;

  // 同牌型比分值
  if (ca.type === cb.type) {
    return ca.score > cb.score ? 1 : ca.score < cb.score ? -1 : 0;
  }

  // 不同牌型不可比较
  return 0;
}

// ---------------------------------------------------------------------------
// isBomb / isRocket
// ---------------------------------------------------------------------------
export function isBomb(cards: Card[], levelRank: number): boolean {
  const result = classifyHand(cards, levelRank);
  return result !== null && result.type === 'bomb';
}

export function isRocket(cards: Card[]): boolean {
  if (cards.length !== 4) return false;
  if (!cards.every(c => c.suit === 'joker')) return false;
  const big = cards.filter(c => c.rank === 'JOKER').length;
  return big === 2;
}
