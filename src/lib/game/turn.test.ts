import { describe, it, expect } from 'vitest';
import { validatePlay, canPass, nextSeat, resolveNewRound, sameTeam, calculateUpgrade } from './turn';
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
// validatePlay
// ---------------------------------------------------------------------------
describe('validatePlay', () => {
  it('领牌：合法单张', () => {
    const hand = [c(3), c(5), c(8)];
    const result = validatePlay(hand, [c(3)], null, 5);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('领牌：非法牌型（两张不同牌）返回错误', () => {
    const hand = [c(3), c(5), c(8)];
    const result = validatePlay(hand, [c(3), c(5)], null, 5);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('跟牌：合法且比上家大', () => {
    const hand = [c(3), c(8), c(14)];
    const lastPlay = { seatNo: 1, type: 'single' as const, cards: [c(6)] };
    const result = validatePlay(hand, [c(8)], lastPlay, 5);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('跟牌：合法但比上家小，返回错误', () => {
    const hand = [c(3), c(8), c(14)];
    const lastPlay = { seatNo: 1, type: 'single' as const, cards: [c(14)] };
    const result = validatePlay(hand, [c(8)], lastPlay, 5);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('选中的牌不在手牌中，返回错误', () => {
    const hand = [c(3), c(5), c(8)];
    const result = validatePlay(hand, [c(14)], null, 5);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('跟牌：炸弹（四张）大于非炸弹单张', () => {
    const hand = [c(8), c(8), c(8), c(8)];
    const lastPlay = { seatNo: 1, type: 'single' as const, cards: [c(14)] };
    const result = validatePlay(hand, [c(8), c(8), c(8), c(8)], lastPlay, 5);
    expect(result.valid).toBe(true);
  });

  it('点数相同但花色不同的对子合法', () => {
    const hand = [c(5, 'spade'), c(5, 'heart'), c(5, 'club')];
    const result = validatePlay(hand, [c(5, 'spade'), c(5, 'heart')], null, 5);
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// canPass
// ---------------------------------------------------------------------------
describe('canPass', () => {
  it('跟牌者可以过牌', () => {
    expect(canPass(true)).toBe(true);
  });

  it('领牌者不能过牌', () => {
    expect(canPass(false)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// nextSeat
// ---------------------------------------------------------------------------
describe('nextSeat', () => {
  it('逆时针：0 → 3', () => expect(nextSeat(0)).toBe(3));
  it('逆时针：1 → 0', () => expect(nextSeat(1)).toBe(0));
  it('逆时针：2 → 1', () => expect(nextSeat(2)).toBe(1));
  it('逆时针：3 → 2', () => expect(nextSeat(3)).toBe(2));
});

// ---------------------------------------------------------------------------
// resolveNewRound
// ---------------------------------------------------------------------------
describe('resolveNewRound', () => {
  it('连续3人Pass → 新轮次，lastSeat成为领牌者', () => {
    const result = resolveNewRound(3, 2);
    expect(result.newRound).toBe(true);
    expect(result.leader).toBe(2);
  });

  it('未满3人Pass → 继续当前轮', () => {
    expect(resolveNewRound(0, 1).newRound).toBe(false);
    expect(resolveNewRound(1, 1).newRound).toBe(false);
    expect(resolveNewRound(2, 1).newRound).toBe(false);
  });

  it('超过3人Pass → 也开启新轮次', () => {
    const result = resolveNewRound(4, 0);
    expect(result.newRound).toBe(true);
    expect(result.leader).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// sameTeam
// ---------------------------------------------------------------------------
describe('sameTeam', () => {
  it('0和2是队友（对坐）', () => expect(sameTeam(0, 2)).toBe(true));
  it('1和3是队友（对坐）', () => expect(sameTeam(1, 3)).toBe(true));
  it('2和0是队友', () => expect(sameTeam(2, 0)).toBe(true));
  it('3和1是队友', () => expect(sameTeam(3, 1)).toBe(true));
  it('0和1不是队友', () => expect(sameTeam(0, 1)).toBe(false));
  it('0和3不是队友', () => expect(sameTeam(0, 3)).toBe(false));
  it('1和2不是队友', () => expect(sameTeam(1, 2)).toBe(false));
});

// ---------------------------------------------------------------------------
// calculateUpgrade
// ---------------------------------------------------------------------------
describe('calculateUpgrade', () => {
  it('头游+二游同队 → 升3级', () => {
    // 0和2是队友，分获第1、2名
    expect(calculateUpgrade([0, 2, 1, 3])).toBe(3);
    expect(calculateUpgrade([1, 3, 0, 2])).toBe(3);
  });

  it('头游+三游同队 → 升2级', () => {
    // 0和2是队友，第1名是0，第3名是2
    expect(calculateUpgrade([0, 1, 2, 3])).toBe(2);
    // 1和3是队友，第1名是1，第3名是3
    expect(calculateUpgrade([1, 0, 3, 2])).toBe(2);
  });

  it('头游+末游同队 → 升1级', () => {
    // 0和2是队友，第1名是0，第4名是2
    expect(calculateUpgrade([0, 1, 3, 2])).toBe(1);
    expect(calculateUpgrade([1, 0, 2, 3])).toBe(1);
  });

  it('排名不完整时返回0', () => {
    expect(calculateUpgrade([0, 1])).toBe(0);
    expect(calculateUpgrade([])).toBe(0);
  });
});
