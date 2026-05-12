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

  // 逢人配（可用作任意值，不计入 byValue）
  const wilds = hand.filter(
    (c) => c.suit === 'heart' && c.value === levelRank,
  );
  const wildCount = wilds.length;

  // 按值分组（排除逢人配）
  const byValue = new Map<number, Card[]>();
  for (const card of hand) {
    if (card.suit === 'heart' && card.value === levelRank) continue;
    const arr = byValue.get(card.value) || [];
    arr.push(card);
    byValue.set(card.value, arr);
  }
  const values = [...byValue.keys()].sort((a, b) => a - b);

  // 单张
  for (const card of hand) addOption([card]);

  // 对子 / 三同张 / 炸弹（含逢人配补齐）
  for (const [value, cards] of byValue) {
    const total = cards.length + wildCount;
    if (total >= 2) addOption([...cards, ...wilds].slice(0, 2));
    if (total >= 3) addOption([...cards, ...wilds].slice(0, 3));
    for (let c = 4; c <= total; c++) addOption([...cards, ...wilds].slice(0, c));
  }

  // 三带二（逢人配补齐到3同或对子）
  for (const tv of values) {
    const tn = (byValue.get(tv)?.length ?? 0);
    for (const pv of values) {
      const pn = (byValue.get(pv)?.length ?? 0);
      if (tv === pv && tn + wildCount < 5) continue;
      const needT = Math.max(0, 3 - tn);
      const needP = Math.max(0, 2 - (pv === tv ? Math.max(0, pn - 3) : pn));
      if (needT + needP > wildCount) continue;
      const tCards = byValue.get(tv)!.slice(0, 3);
      const wUsedForT = wilds.slice(0, needT);
      const wRest = wilds.slice(needT);
      const pPool = byValue.get(pv)!.filter((c) => !tCards.includes(c));
      const pCards = [...pPool, ...wRest].slice(0, 2);
      if (pCards.length === 2) addOption([...tCards, ...wUsedForT, ...pCards]);
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
  return decideFollow(hand, validPlays, analysis, lastPlay, levelRank, context);
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

  // 同伴配合：根据队友剩余牌数精确喂牌
  if (context) {
    const teammateSeat = context.mySeat % 2 === 0 ? context.mySeat + 2 : context.mySeat - 2;
    if (teammateSeat >= 0 && teammateSeat < 4) {
      const tc = context.opponentHandSizes[teammateSeat];
      if (tc === 1) {
        // 队友剩1张：出最小单张必赢
        const s = nonBombPlays.filter((p) => p.classified.type === 'single');
        if (s.length > 0) { const m = s.reduce((a,b) => a.classified.score < b.classified.score ? a : b); return { type: 'play', cards: m.cards }; }
      }
      if (tc === 2) {
        // 队友剩2张：可能是对子或两张单→出最小单张或对子
        const s = nonBombPlays.filter((p) => p.classified.type === 'single');
        const p = nonBombPlays.filter((p) => p.classified.type === 'pair');
        const all = [...s, ...p];
        if (all.length > 0) { const m = all.reduce((a,b) => a.classified.score < b.classified.score ? a : b); return { type: 'play', cards: m.cards }; }
      }
      if (tc === 3) {
        // 队友剩3张：出单张让队友灵活处理
        const s = nonBombPlays.filter((p) => p.classified.type === 'single');
        if (s.length > 0) { const m = s.reduce((a,b) => a.classified.score < b.classified.score ? a : b); return { type: 'play', cards: m.cards }; }
      }
      if (tc >= 4 && tc <= 6) {
        // 队友手牌 4-6：优先出对子（清牌效率高）
        const p = nonBombPlays.filter((p) => p.classified.type === 'pair');
        if (p.length > 0) { const m = p.reduce((a,b) => a.classified.score < b.classified.score ? a : b); return { type: 'play', cards: m.cards }; }
      }
      if (tc >= 7 && tc <= 10) {
        // 队友手牌 7-10：出三同或顺子帮队友清牌
        const t = nonBombPlays.filter((p) => p.classified.type === 'triple' || p.classified.type === 'straight');
        if (t.length > 0) { const m = t.reduce((a,b) => a.classified.score < b.classified.score ? a : b); return { type: 'play', cards: m.cards }; }
      }
    }
  }

  // 手牌多(>15)时不先出大单张锁死 → 出最小单张
  if (hand.length > 15) {
    const smallSingles = nonBombPlays
      .filter((p) => p.classified.type === 'single')
      .sort((a, b) => a.classified.score - b.classified.score);
    if (smallSingles.length > 0) return { type: 'play', cards: smallSingles[0].cards };
  }

  // 对手弱点：某个对手牌很少时不出他能接的牌型
  if (context) {
    const weakOpp = context.opponentHandSizes.findIndex(
      (size, i) => i !== context!.mySeat && !sameTeam(context!.mySeat, i) && size > 0 && size <= 3
    );
    if (weakOpp !== -1) {
      // 对手牌少→避免出单张（容易被接），优先出对子或三同
      const p = nonBombPlays.filter((p) => p.classified.type === 'pair');
      const t = nonBombPlays.filter((p) => p.classified.type === 'triple');
      const prefer = [...p, ...t];
      if (prefer.length > 0) { const m = prefer.reduce((a,b) => a.classified.score < b.classified.score ? a : b); return { type: 'play', cards: m.cards }; }
    }
  }

  // 出孤立牌（最小的单张，已由 analysis 过滤出非对子/三同组件）
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

  // 三同张（清 3 张）
  const triplePlays = nonBombPlays.filter((p) => p.classified.type === 'triple');
  if (triplePlays.length > 0) {
    const minTriple = triplePlays.reduce((min, p) =>
      p.classified.score < min.classified.score ? p : min,
    );
    return { type: 'play', cards: minTriple.cards };
  }

  // 顺子（清 5 张）
  const straightPlays = nonBombPlays.filter((p) => p.classified.type === 'straight');
  if (straightPlays.length > 0) {
    const minStraight = straightPlays.reduce((min, p) =>
      p.classified.score < min.classified.score ? p : min,
    );
    return { type: 'play', cards: minStraight.cards };
  }

  // 三带二（清 5 张）
  const fullHouse = nonBombPlays.find((p) => p.classified.type === 'triple_pair');
  if (fullHouse) return { type: 'play', cards: fullHouse.cards };

  // 连对/钢板（清 6 张）
  const seqPlays = nonBombPlays.filter(
    (p) => p.classified.type === 'sequence_pairs' || p.classified.type === 'sequence_triples',
  );
  if (seqPlays.length > 0) {
    const minSeq = seqPlays.reduce((min, p) =>
      p.classified.score < min.classified.score ? p : min,
    );
    return { type: 'play', cards: minSeq.cards };
  }

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
  levelRank: number,
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
    // 记忆驱动：有安全牌（更大同类已出完）则优先出
    const memForPlay = getCardMemory();
    const isSafeSingle = (score: number): boolean => {
      for (let v = score + 1; v <= 14; v++) { if (memForPlay.remainingCount(v) > 0) return false; }
      if (score < 50 && memForPlay.remainingCount(levelRank) > 0) return false;
      if (score < 100 && memForPlay.smallJokersLeft() > 0) return false;
      if (score < 200 && memForPlay.bigJokersLeft() > 0) return false;
      return true;
    };
    const safePlays = effectiveNonBomb.filter((p) =>
      p.classified.type === 'single' && isSafeSingle(p.classified.score),
    );
    const chosen = safePlays.length > 0 ? safePlays : effectiveNonBomb;
    const minScore = chosen.reduce((min, p) =>
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

  // d) 对手即将获胜 → 拦截（但队友快赢时不炸，让队友清牌）
  if (context) {
    const hasCloseOpponent = context.opponentHandSizes.some(
      (size, i) => i !== context.mySeat && size > 0 && size <= 2 && !sameTeam(context.mySeat, i),
    );
    if (hasCloseOpponent) return { type: 'play', cards: minBomb.cards };
    // 对手出牌队友接不住且队友手牌多→炸弹截断保护队友
    const mateSeat = context.mySeat % 2 === 0 ? context.mySeat + 2 : context.mySeat - 2;
    if (mateSeat >= 0 && mateSeat < 4) {
      const mateCards = context.opponentHandSizes[mateSeat];
      if (mateCards >= 5 && context.lastPlaySeat !== undefined && !sameTeam(context.mySeat, context.lastPlaySeat)) {
        return { type: 'play', cards: minBomb.cards };
      }
    }
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
