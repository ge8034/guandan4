import type { Card, ClassifiedHand } from './types';
import { classifyHand, compareHands } from './rules';
import { sameTeam } from './turn';
import { getCardMemory } from './memory';

interface PlayOption {
  type: 'play';
  cards: Card[];
  classified: ClassifiedHand;
}

type AIDecision =
  | { type: 'play'; cards: Card[] }
  | { type: 'pass' };

/** AI 决策上下文（困难模式附加信息） */
export interface AIContext {
  mySeat: number;
  opponentHandSizes: number[];
  /** 最后出牌者的座位号，用于判断是否同伴在领牌 */
  lastPlaySeat?: number;
}

/** 从手牌枚举所有合法出牌选项 */
export function getValidPlays(
  hand: Card[],
  lastPlay: ClassifiedHand | null,
  levelRank: number,
): PlayOption[] {
  if (hand.length === 0) return [];

  const options: PlayOption[] = [];
  const seen = new Set<string>();

  function addOption(cards: Card[]): void {
    const key = cards.map((c) => `${c.suit}-${c.value}`).sort().join(',');
    if (seen.has(key)) return;
    seen.add(key);
    const classified = classifyHand(cards, levelRank);
    if (!classified) return;
    if (lastPlay && compareHands(cards, lastPlay.cards, levelRank) <= 0) return;
    options.push({ type: 'play', cards, classified });
  }

  // 按值分组
  const byValue = new Map<number, Card[]>();
  for (const card of hand) {
    const arr = byValue.get(card.value) || [];
    arr.push(card);
    byValue.set(card.value, arr);
  }
  const values = [...byValue.keys()].sort((a, b) => a - b);

  // 单张
  for (const card of hand) addOption([card]);

  // 对子 / 三同张 / 炸弹
  for (const [, cards] of byValue) {
    if (cards.length >= 2) addOption(cards.slice(0, 2));
    if (cards.length >= 3) addOption(cards.slice(0, 3));
    for (let c = 4; c <= cards.length; c++) addOption(cards.slice(0, c));
  }

  // 三带二
  const triples = values.filter((v) => (byValue.get(v)?.length ?? 0) >= 3);
  const pairs = values.filter((v) => (byValue.get(v)?.length ?? 0) >= 2);
  for (const tv of triples) {
    for (const pv of pairs) {
      if (pv === tv && (byValue.get(tv)?.length ?? 0) < 5) continue;
      const tCards = byValue.get(tv)!.slice(0, 3);
      const pCards = byValue.get(pv)!.filter((c) => !tCards.includes(c)).slice(0, 2);
      if (pCards.length === 2) addOption([...tCards, ...pCards]);
    }
  }

  // 顺子（5张连续，不要求同花色）
  const allNonJokers = hand.filter((c) => c.suit !== 'joker');
  const allValues = new Set(allNonJokers.map((c) => c.value));
  for (let start = 2; start <= 10; start++) {
    const needed = [start, start + 1, start + 2, start + 3, start + 4];
    if (needed.every((v) => allValues.has(v))) {
      const straightCards = needed.map((v) =>
        allNonJokers.find((c) => c.value === v)!
      );
      addOption(straightCards);
    }
  }

  // 连对（3组连续对子）
  for (let start = 2; start <= 12; start++) {
    const v1 = start, v2 = start + 1, v3 = start + 2;
    const c1 = byValue.get(v1)?.length ?? 0;
    const c2 = byValue.get(v2)?.length ?? 0;
    const c3 = byValue.get(v3)?.length ?? 0;
    if (c1 >= 2 && c2 >= 2 && c3 >= 2) {
      addOption([
        ...byValue.get(v1)!.slice(0, 2),
        ...byValue.get(v2)!.slice(0, 2),
        ...byValue.get(v3)!.slice(0, 2),
      ]);
    }
  }

  // 钢板（2组连续三同张）
  for (let start = 2; start <= 13; start++) {
    const v1 = start, v2 = start + 1;
    const c1 = byValue.get(v1)?.length ?? 0;
    const c2 = byValue.get(v2)?.length ?? 0;
    if (c1 >= 3 && c2 >= 3) {
      addOption([
        ...byValue.get(v1)!.slice(0, 3),
        ...byValue.get(v2)!.slice(0, 3),
      ]);
    }
  }

  // 火箭（2大王+2小王）
  const bigJokers = hand.filter((c) => c.suit === 'joker' && (c.rank === 'JOKER' || c.value === 200));
  const smallJokers = hand.filter((c) => c.suit === 'joker' && (c.rank === 'SJOKER' || c.value === 100));
  if (bigJokers.length >= 2 && smallJokers.length >= 2) {
    addOption([...bigJokers.slice(0, 2), ...smallJokers.slice(0, 2)]);
  }

  // 按分值降序排列
  options.sort((a, b) => b.classified.score - a.classified.score);
  return options;
}

/** AI 决策主入口 */
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
    return decideLead(hand, validPlays, analysis, context);
  }
  return decideFollow(hand, validPlays, analysis, lastPlay, context);
}

// ---- 手牌结构分析 ----

interface HandAnalysis {
  isolated: Card[];            // 孤立牌
  pairs: { value: number; cards: Card[] }[];
  triples: { value: number; cards: Card[] }[];
  bombs: { value: number; cards: Card[] }[];
  wilds: Card[];               // 逢人配
  hasRocket: boolean;
  groupsCount: number;         // 已形成牌型的总组数
}

function analyzeHand(hand: Card[], levelRank: number): HandAnalysis {
  const byValue = new Map<number, Card[]>();
  const wilds: Card[] = [];

  for (const card of hand) {
    if (card.suit === 'heart' && card.value === levelRank) {
      wilds.push(card);
      continue;
    }
    const arr = byValue.get(card.value) || [];
    arr.push(card);
    byValue.set(card.value, arr);
  }

  const pairs: HandAnalysis['pairs'] = [];
  const triples: HandAnalysis['triples'] = [];
  const bombs: HandAnalysis['bombs'] = [];
  const isolated: Card[] = [];

  for (const [value, cards] of byValue) {
    const total = cards.length + wilds.length;
    if (total >= 4) bombs.push({ value, cards });
    if (total >= 3) triples.push({ value, cards: cards.slice(0, 3) });
    if (total >= 2) pairs.push({ value, cards: cards.slice(0, 2) });
  }

  // 孤立牌：不能组成对子/三同张/炸弹的单张
  const groupedValues = new Set([...pairs, ...triples, ...bombs].map((g) => g.value));
  for (const [value, cards] of byValue) {
    if (!groupedValues.has(value)) {
      isolated.push(...cards);
    }
  }

  // 检测火箭
  const jokers = hand.filter((c) => c.suit === 'joker');
  const bigJokers = jokers.filter((c) => c.value === 200 || c.rank === 'JOKER').length;
  const smallJokers = jokers.filter((c) => c.value === 100 || c.rank === 'SJOKER').length;
  const hasRocket = bigJokers >= 2 && smallJokers >= 2;

  const groupsCount = pairs.length + triples.length + bombs.length + (hasRocket ? 1 : 0);

  return { isolated, pairs, triples, bombs, wilds, hasRocket, groupsCount };
}

// ---- 决策逻辑 ----

function decideLead(
  hand: Card[],
  validPlays: PlayOption[],
  analysis: HandAnalysis,
  context?: AIContext,
): AIDecision {
  const nonBombPlays = validPlays.filter(
    (p) => p.classified.type !== 'bomb' && p.classified.type !== 'rocket',
  );

  if (nonBombPlays.length === 0) {
    // 只剩炸弹 → 出最小的炸弹
    const minBomb = validPlays.reduce((min, p) =>
      p.classified.score < min.classified.score ? p : min,
    );
    return { type: 'play', cards: minBomb.cards };
  }

  // 冲刺：手牌 ≤ 5 且能一组出完
  if (hand.length <= 5) {
    const oneShot = nonBombPlays.find((p) => p.cards.length === hand.length);
    if (oneShot) return { type: 'play', cards: oneShot.cards };
  }

  // 同伴配合：队友快赢时优先出单张（最灵活，方便队友接牌）
  if (context) {
    const teammateSeat = context.mySeat % 2 === 0 ? context.mySeat + 2 : context.mySeat - 2;
    if (teammateSeat >= 0 && teammateSeat < 4) {
      const teammateCards = context.opponentHandSizes[teammateSeat];
      if (teammateCards > 0 && teammateCards <= 4) {
        // 队友手牌 ≤ 4：出单张让队友可以过牌或跟牌
        const singlePlays = nonBombPlays.filter((p) => p.classified.type === 'single');
        if (singlePlays.length > 0) {
          const minSingle = singlePlays.reduce((min, p) =>
            p.classified.score < min.classified.score ? p : min,
          );
          return { type: 'play', cards: minSingle.cards };
        }
      }
      // 队友手牌 5-8：优先出对子（清牌效率更高，队友也更容易接）
      if (teammateCards >= 5 && teammateCards <= 8) {
        const pairPlays = nonBombPlays.filter((p) => p.classified.type === 'pair');
        if (pairPlays.length > 0) {
          const minPair = pairPlays.reduce((min, p) =>
            p.classified.score < min.classified.score ? p : min,
          );
          return { type: 'play', cards: minPair.cards };
        }
      }
    }
  }

  // 出孤立牌（最小的单张）
  const isolatedSingles = nonBombPlays.filter(
    (p) =>
      p.classified.type === 'single' &&
      analysis.isolated.some((c) => c === p.cards[0]),
  );
  if (isolatedSingles.length > 0) {
    const minPlay = isolatedSingles.reduce((min, p) =>
      p.classified.score < min.classified.score ? p : min,
    );
    return { type: 'play', cards: minPlay.cards };
  }

  // 出最小的对子
  const pairPlays = nonBombPlays.filter((p) => p.classified.type === 'pair');
  if (pairPlays.length > 0) {
    const minPair = pairPlays.reduce((min, p) =>
      p.classified.score < min.classified.score ? p : min,
    );
    return { type: 'play', cards: minPair.cards };
  }

  // 三带二（优先清多牌）
  const fullHouse = nonBombPlays.find((p) => p.classified.type === 'triple_pair');
  if (fullHouse) return { type: 'play', cards: fullHouse.cards };

  // 出最小的单张
  const minSingle = nonBombPlays
    .filter((p) => p.classified.type === 'single')
    .reduce((min, p) =>
      p.classified.score < min.classified.score ? p : min,
    );
  if (minSingle) return { type: 'play', cards: minSingle.cards };

  // 兜底：出分值最小的合法选项
  const minPlay = nonBombPlays.reduce((min, p) =>
    p.classified.score < min.classified.score ? p : min,
  );
  return { type: 'play', cards: minPlay.cards };
}

function decideFollow(
  hand: Card[],
  validPlays: PlayOption[],
  analysis: HandAnalysis,
  lastPlay: ClassifiedHand,
  context?: AIContext,
): AIDecision {
  const nonBombPlays = validPlays.filter(
    (p) => p.classified.type !== 'bomb' && p.classified.type !== 'rocket',
  );
  const bombPlays = validPlays.filter(
    (p) => p.classified.type === 'bomb' || p.classified.type === 'rocket',
  );

  // 有火箭时不要用王当单张（保留王的完整性）
  const rocketPlay = bombPlays.find((p) => p.classified.type === 'rocket');
  const effectiveNonBomb = rocketPlay
    ? nonBombPlays.filter(
        (p) => !p.cards.some((c) => c.suit === 'joker'),
      )
    : nonBombPlays;

  // 能用非炸弹管上
  if (effectiveNonBomb.length > 0) {
    const memory = getCardMemory();
    // 记牌驱动：检查出的牌是否"真大"（剩余同类型牌中无更大的）
    const topPlay = effectiveNonBomb.reduce((max, p) =>
      p.classified.score > max.classified.score ? p : max,
    );
    const isTrulyBig =
      lastPlay.type !== 'bomb' && lastPlay.type !== 'rocket' &&
      memory.remainingCount(lastPlay.cards[0].value) <= 1; // 近似判断：上家出的牌值只剩1张

    // 同伴配合：如果领牌者是队友且我出的不是"真大"牌，让队友继续领
    if (!isTrulyBig && context?.lastPlaySeat != null && sameTeam(context.mySeat, context.lastPlaySeat)) {
      return { type: 'pass' };
    }
    // 选分值最低的（刚好管上）
    const minScore = effectiveNonBomb.reduce((min, p) =>
      p.classified.score < min.classified.score ? p : min,
    );
    return { type: 'play', cards: minScore.cards };
  }

  // 非炸弹管不上 → 评估是否用炸弹
  if (bombPlays.length === 0) return { type: 'pass' };

  const minBomb = bombPlays.reduce((min, p) =>
    p.classified.score < min.classified.score ? p : min,
  );

  // 残局清牌：手牌 ≤ 3 组 → 用炸弹加速
  if (analysis.groupsCount <= 3 && hand.length <= 8) return { type: 'play', cards: minBomb.cards };

  // a) 手牌 ≤ 4 张 → 炸弹清场
  if (hand.length <= 4) return { type: 'play', cards: minBomb.cards };

  // 记牌驱动炸弹风险：对手可能没炸弹时降低出手门槛
  const memory = getCardMemory();
  const opponentBombPossible = memory.bombPossible();

  // d) 对手即将获胜 → 拦截
  if (context) {
    const hasCloseOpponent = context.opponentHandSizes.some(
      (size, i) => i !== context.mySeat && size > 0 && size <= 2,
    );
    if (hasCloseOpponent) return { type: 'play', cards: minBomb.cards };
  }

  // b) 手牌 ≤ 8 张且有火箭 → 火箭确保赢
  if (hand.length <= 8 && analysis.hasRocket) {
    const rocket = bombPlays.find((p) => p.classified.type === 'rocket');
    if (rocket) return { type: 'play', cards: rocket.cards };
  }

  // e) 我方炸弹不可超越（火箭或 7+ 张炸弹）且手牌 ≤ 10 → 降低门槛出手
  if (hand.length <= 10) {
    const unbeatableBomb = bombPlays.find(
      (p) =>
        p.classified.type === 'rocket' ||
        (p.classified.type === 'bomb' && p.cards.length >= 7),
    );
    if (unbeatableBomb) return { type: 'play', cards: unbeatableBomb.cards };
  }

  // 对手无炸弹时放宽炸弹门槛（手牌≤8即可）
  if (!opponentBombPossible && hand.length <= 8) return { type: 'play', cards: minBomb.cards };

  // c) 手牌 ≤ 2 组牌型 → 炸弹加速清牌
  if (analysis.groupsCount <= 2) return { type: 'play', cards: minBomb.cards };

  // d) 手牌 ≤ 6 张 → 用炸弹
  if (hand.length <= 6) return { type: 'play', cards: minBomb.cards };

  // e) 其他情况 → 过牌
  return { type: 'pass' };
}
