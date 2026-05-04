import type { Card, HandType } from './types';
import { classifyHand, compareHands } from './rules';

/**
 * 验证玩家出牌是否合法
 *
 * @param hand - 玩家当前手牌列表
 * @param selectedCards - 玩家选中的要出的牌
 * @param lastPlay - 上家出的牌（null 表示领牌）
 * @param levelRank - 当前级牌点数
 * @returns 验证结果
 */
export function validatePlay(
  hand: Card[],
  selectedCards: Card[],
  lastPlay: { seatNo: number; type: HandType; cards: Card[] } | null,
  levelRank: number,
): { valid: boolean; error?: string } {
  // 1. 检查选中的牌是否全部在手牌中（按 suit + value 匹配）
  const remaining = [...hand];
  for (const selected of selectedCards) {
    const idx = remaining.findIndex(
      h => h.suit === selected.suit && h.value === selected.value,
    );
    if (idx === -1) {
      return { valid: false, error: '选中的牌不在手牌中' };
    }
    remaining.splice(idx, 1);
  }

  // 2. 检查是否为合法牌型
  const classified = classifyHand(selectedCards, levelRank);
  if (!classified) {
    return { valid: false, error: '无效牌型' };
  }

  // 3. 如果是跟牌，检查是否比上家大
  if (lastPlay) {
    const comparison = compareHands(selectedCards, lastPlay.cards, levelRank);
    if (comparison <= 0) {
      return { valid: false, error: '管不上' };
    }
  }

  return { valid: true };
}

/**
 * 判断当前玩家是否可以过牌
 *
 * @param isFollowing - 当前玩家是否为跟牌者
 * @returns 是否可以过牌
 */
export function canPass(isFollowing: boolean): boolean {
  return isFollowing;
}

/**
 * 计算下一位出牌玩家的座位号（逆时针轮转：3→2→1→0→3）
 *
 * @param currentSeat - 当前玩家的座位号
 * @returns 下一位玩家的座位号
 */
export function nextSeat(currentSeat: number): number {
  return (currentSeat + 3) % 4;
}

/**
 * 判断两个座位是否为队友（对坐：0↔2、1↔3）
 */
export function sameTeam(a: number, b: number): boolean {
  return a % 2 === b % 2;
}

/**
 * 根据排名计算升级级数
 *
 * 规则：
 * - 头游+二游同队 → 升3级（双上）
 * - 头游+三游同队 → 升2级
 * - 头游+末游同队 → 升1级
 *
 * @param rankings - 出完顺序 [第1名, 第2名, 第3名, 第4名]
 * @returns 升级级数
 */
export function calculateUpgrade(rankings: number[]): number {
  if (rankings.length < 4) return 0;
  const first = rankings[0];
  const mate = rankings.find((s) => s !== first && sameTeam(s, first))!;

  if (mate === rankings[1]) return 3;
  if (mate === rankings[2]) return 2;
  return 1;
}

/**
 * 解析是否开启新轮次（重新领牌）
 *
 * 连续 3 人过牌时，当前轮结束，lastSeat 成为新领牌者。
 *
 * @param passCount - 连续过牌人数
 * @param lastSeat - 最后出牌玩家的座位号
 * @returns 是否新轮次及新领牌者座位号
 */
export function resolveNewRound(
  passCount: number,
  lastSeat: number,
): { newRound: boolean; leader: number } {
  if (passCount >= 3) {
    return { newRound: true, leader: lastSeat };
  }
  return { newRound: false, leader: lastSeat };
}
