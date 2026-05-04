import { describe, it, expect } from 'vitest';
import type { Card } from './types';
import { createDeck, shuffle, deal } from './deck';
import { classifyHand, compareHands, isBomb } from './rules';
import { validatePlay, nextSeat, calculateUpgrade } from './turn';
import { determineTributePairs, canResistTribute, getTributeCard, getReturnCard } from './tribute';
import { resolveNewRound } from './turn';
import { aiDecide } from './ai';

function c(suit: string, value: number): Card {
  const rankMap: Record<number, string> = {
    2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8',
    9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A',
    100: 'SJ', 200: 'BJ',
  };
  return { suit: suit as Card['suit'], rank: rankMap[value] || String(value), value };
}

describe('集成测试 — 完整一局流程', () => {
  it('发牌 → 每人27张 → 牌型识别 → 出牌验证', () => {
    const levelRank = 2;
    const deck = shuffle(createDeck());
    const hands = deal(deck);

    // 验证发牌
    expect(hands).toHaveLength(4);
    hands.forEach((h) => expect(h).toHaveLength(27));

    // 验证排序
    for (const hand of hands) {
      for (let i = 1; i < hand.length; i++) {
        const prev = hand[i - 1];
        const curr = hand[i];
        // 花色顺序或同花色点数降序
        const suitOrder = { spade: 4, heart: 3, club: 2, diamond: 1, joker: 0 };
        const prevSuit = suitOrder[prev.suit] || 0;
        const currSuit = suitOrder[curr.suit] || 0;
        expect(
          prevSuit > currSuit || (prevSuit === currSuit && prev.value >= curr.value)
        ).toBe(true);
      }
    }

    // 每手牌至少能识别单张
    for (const hand of hands) {
      const single = classifyHand([hand[0]], levelRank);
      expect(single).not.toBeNull();
      expect(single!.type).toBe('single');
    }
  });

  it('基本的出牌流程：领牌 → 跟牌 → 过牌 → 新轮', () => {
    const levelRank = 2;
    const hands: Card[][] = [
      [c('spade', 14), c('spade', 13), c('spade', 10)],
      [c('heart', 12), c('heart', 8), c('heart', 3)],
      [c('diamond', 11), c('diamond', 9), c('diamond', 5)],
      [c('club', 14), c('club', 13), c('club', 7)],
    ];

    // 领牌：seat 0 出 A
    let result = validatePlay(hands[0], [c('spade', 14)], null, levelRank);
    expect(result.valid).toBe(true);

    // 跟牌：seat 1 出牌需大于 A（12 < 14，管不上）
    result = validatePlay(
      hands[1],
      [c('heart', 12)],
      { seatNo: 0, type: 'single', cards: [c('spade', 14)] },
      levelRank,
    );
    expect(result.valid).toBe(false);
    expect(result.error).toBe('管不上');
  });

  it('炸弹比较：张数多者大 → 同张数比点数', () => {
    const levelRank = 2;
    const bomb4 = [c('spade', 5), c('heart', 5), c('club', 5), c('diamond', 5)];
    const bomb5 = [c('spade', 3), c('heart', 3), c('club', 3), c('diamond', 3), c('spade', 3)];

    const cmp1 = compareHands(bomb4, bomb5, levelRank);
    expect(cmp1).toBe(-1); // 4张炸弹 < 5张炸弹

    const bombK = [c('spade', 13), c('heart', 13), c('club', 13), c('diamond', 13)];
    const cmp2 = compareHands(bombK, bomb4, levelRank);
    expect(cmp2).toBe(1); // K炸弹 > 5炸弹
  });

  it('进贡关系判定：头游+二游同队 → 双贡', () => {
    // seat 0(头游) + seat 2(二游) 同队
    const pairs = determineTributePairs([0, 2, 1, 3]);
    expect(pairs).toHaveLength(2);
    expect(pairs).toContainEqual({ from: 3, to: 0 });
    expect(pairs).toContainEqual({ from: 1, to: 2 });
  });

  it('抗贡：持有两张大王可抗贡', () => {
    const hand = [
      c('heart', 200),
      c('diamond', 200),
      c('spade', 3),
    ];
    expect(canResistTribute(hand)).toBe(true);
  });

  it('完整两局：第1局结束→进贡→第2局', () => {
    function simRound(lv: number, prevRk: number[] | null): number[] {
      let h = deal(shuffle(createDeck()));
      if (prevRk?.length === 4) {
        const pairs = determineTributePairs(prevRk);
        for (const p of pairs) {
          if (canResistTribute(h[p.from])) continue;
          const tc = getTributeCard(h[p.from]); const rc = getReturnCard(h[p.to]);
          if (tc) { const i = h[p.from].findIndex(x => x.suit === tc.suit && x.value === tc.value); if (i !== -1) h[p.from].splice(i, 1); h[p.to].push(tc); }
          if (rc) { const i = h[p.to].findIndex(x => x.suit === rc.suit && x.value === rc.value); if (i !== -1) h[p.to].splice(i, 1); h[p.from].push(rc); }
        }
      }
      let cs = prevRk?.[0] ?? 0, tn = 1, pc = 0, lp: any = null, rk: number[] = [];
      while (tn < 3000 && rk.length < 3) {
        const hd = h[cs]; if (hd.length === 0) { cs = nextSeat(cs); continue; }
        const d = aiDecide([...hd], lp ? classifyHand(lp.cards, lv) : null, lv);
        if (d.type === 'play') {
          const nh = h.map(x => [...x]);
          for (const c of d.cards) { const i = nh[cs].findIndex(x => x.suit === c.suit && x.value === c.value); if (i !== -1) nh[cs].splice(i, 1); }
          h = nh; lp = { seatNo: cs, type: classifyHand(d.cards, lv)!.type, cards: [...d.cards] }; pc = 0;
          if (h[cs].length === 0 && !rk.includes(cs)) rk.push(cs);
          cs = nextSeat(cs); while (h[cs].length === 0) cs = nextSeat(cs); tn++;
        } else { if (!lp) break; pc++; const nr = resolveNewRound(pc, lp.seatNo); if (nr.newRound) { lp = null; pc = 0; cs = nr.leader; } else { cs = nextSeat(cs); while (h[cs].length === 0) cs = nextSeat(cs); } tn++; }
      }
      const rm = [0, 1, 2, 3].filter(s => !rk.includes(s));
      return [...rk, ...rm];
    }
    const r1 = simRound(2, null);
    expect(r1).toHaveLength(4);
    const r2 = simRound(3, r1);
    expect(r2).toHaveLength(4);
    expect(r1).not.toEqual(r2);
  });

  it('炸弹对决：4张 vs 5张', () => {
    const bomb4 = [c('spade',5),c('heart',5),c('club',5),c('diamond',5)];
    const bomb5 = [c('spade',3),c('heart',3),c('club',3),c('diamond',3),c('spade',3)];
    expect(compareHands(bomb5, bomb4, 2)).toBe(1);
    expect(compareHands(bomb4, bomb5, 2)).toBe(-1);
  });

  it('级牌炸弹 vs 普通炸弹', () => {
    const lv = 5;
    const levelBomb = [c('spade',5),c('heart',5),c('club',5),c('diamond',5)];
    const normalBomb = [c('spade',8),c('heart',8),c('club',8),c('diamond',8)];
    expect(compareHands(levelBomb, normalBomb, lv)).toBe(1);
  });
});
