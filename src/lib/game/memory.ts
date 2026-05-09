import type { Card } from './types';

/**
 * 记牌器：追踪已打出的大牌和关键牌，供 AI 决策使用。
 * 108 张牌 = 2副 × 54张，每副含 4花色×13点数 + 小王 + 大王。
 */
export class CardMemory {
  /** value → 已打出张数 */
  private played = new Map<number, number>();

  /** 记录一手打出的牌 */
  record(cards: Card[]): void {
    for (const c of cards) {
      this.played.set(c.value, (this.played.get(c.value) || 0) + 1);
    }
  }

  /** 某点数已打出多少张 */
  playedCount(value: number): number {
    return this.played.get(value) || 0;
  }

  /** 某点数还剩多少张（非王每种点数共 8 张，大王/小王各 2 张） */
  remainingCount(value: number): number {
    const total = value >= 200 ? 2 : value >= 100 ? 2 : 8;
    return total - this.playedCount(value);
  }

  /** 大王还剩几张 */
  bigJokersLeft(): number {
    return this.remainingCount(200);
  }

  /** 小王还剩几张 */
  smallJokersLeft(): number {
    return this.remainingCount(100);
  }

  /** 是否还存在火箭（两大王+两小王）*/
  rocketPossible(): boolean {
    return this.bigJokersLeft() >= 2 && this.smallJokersLeft() >= 2;
  }

  /** 对手是否可能还有炸弹（某点数剩余 ≥ 4 张） */
  bombPossible(): boolean {
    for (let v = 2; v <= 14; v++) {
      if (this.remainingCount(v) >= 4) return true;
    }
    return this.rocketPossible();
  }

  /** 剩余大牌数（A=14 及以上） */
  bigCardsRemaining(): number {
    let count = 0;
    for (let v = 14; v <= 14; v++) {
      count += this.remainingCount(v);
    }
    count += this.remainingCount(100); // 小王
    count += this.remainingCount(200); // 大王
    return count;
  }

  /** 某点数是否已经全部打出 */
  isExhausted(value: number): boolean {
    return this.remainingCount(value) <= 0;
  }

  /** 重置（新一局开始时调用） */
  reset(): void {
    this.played.clear();
  }
}

/** 全局单例 */
let globalMemory: CardMemory | null = null;

export function getCardMemory(): CardMemory {
  if (!globalMemory) {
    globalMemory = new CardMemory();
  }
  return globalMemory;
}

export function resetCardMemory(): void {
  globalMemory = new CardMemory();
}
