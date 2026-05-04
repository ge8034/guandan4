/** 花色 */
export type Suit = 'heart' | 'diamond' | 'club' | 'spade' | 'joker';

/** 牌型 */
export type HandType =
  | 'single'
  | 'pair'
  | 'triple'
  | 'triple_pair'
  | 'straight'
  | 'sequence_pairs'
  | 'sequence_triples'
  | 'bomb'
  | 'rocket'
  | 'pass';

/** 单张卡牌 */
export interface Card {
  suit: Suit;
  rank: string;
  value: number;
}

/** 已分类的牌型结果 */
export interface ClassifiedHand {
  type: HandType;
  cards: Card[];
  score: number;
}

/** 回合记录 */
export interface TurnRecord {
  turnNo: number;
  seatNo: number;
  type: 'play' | 'pass';
  cards?: Card[];
}

/** 游戏阶段 */
export type GamePhase = 'idle' | 'dealing' | 'tribute' | 'playing' | 'finished';

/** 完整游戏状态 */
export interface GameState {
  status: GamePhase;
  phase: 'deal' | 'tribute' | 'play' | 'result';
  deck: Card[];
  hands: Card[][];
  currentSeat: number;
  turnNo: number;
  lastPlay: { seatNo: number; type: HandType; cards: Card[] } | null;
  passCount: number;
  recentTurns: TurnRecord[];
  levelRank: number;
  rankings: number[];
  scores: number[];
  tributeFrom: number[];
  tributeTo: number[];
  tributeCards: Card[];
  returnCards: Card[];
}
