import { create } from 'zustand';
import type { Card, GamePhase, HandType, TurnRecord } from '@/lib/game/types';
import { createDeck, shuffle, deal, sortHands } from '@/lib/game/deck';
import { classifyHand } from '@/lib/game/rules';
import { validatePlay, canPass, nextSeat, resolveNewRound, calculateUpgrade, sameTeam } from '@/lib/game/turn';
import { determineTributePairs, canResistTribute, getTributeCard, getReturnCard } from '@/lib/game/tribute';

interface TributeInfo {
  pairs: { from: number; to: number }[];
  resistSeats: number[];
  processed: boolean;
}

interface GameStore {
  phase: GamePhase;
  hands: Card[][];
  currentSeat: number;
  turnNo: number;
  lastPlay: { seatNo: number; type: HandType; cards: Card[] } | null;
  passCount: number;
  recentTurns: TurnRecord[];
  levelRank: number;
  rankings: number[];
  upgrade: number;
  finalRankings: number[];
  roundNumber: number;
  isFinalVictory: boolean;
  tributeInfo: TributeInfo | null;
  teamLevels: [number, number];
  error: string | null;

  startGame: () => void;
  playCards: (seatNo: number, cards: Card[]) => void;
  passTurn: (seatNo: number) => void;
  handleRemotePlay: (seatNo: number, cards: Card[]) => void;
  handleRemotePass: (seatNo: number) => void;
  finishGame: (finalRankings: number[]) => void;
  startNextRound: () => void;
  resetGame: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'idle',
  hands: [[], [], [], []],
  currentSeat: 0,
  turnNo: 0,
  lastPlay: null,
  passCount: 0,
  recentTurns: [],
  levelRank: 2,
  rankings: [],
  upgrade: 0,
  finalRankings: [],
  roundNumber: 1,
  isFinalVictory: false,
  tributeInfo: null,
  teamLevels: [2, 2],
  error: null,

  startGame: () => {
    const deck = shuffle(createDeck());
    const hands = deal(deck);
    set({
      phase: 'playing',
      hands,
      currentSeat: Math.floor(Math.random() * 4),
      turnNo: 1,
      lastPlay: null,
      passCount: 0,
      recentTurns: [],
      rankings: [],
      roundNumber: 1,
      upgrade: 0,
      finalRankings: [],
      isFinalVictory: false,
      tributeInfo: null,
      teamLevels: [2, 2] as [number, number],
      error: null,
    });
  },

  playCards: (seatNo: number, cards: Card[]) => {
    const state = get();
    if (state.phase !== 'playing') return;
    if (seatNo !== state.currentSeat) {
      set({ error: '不是你的回合' });
      return;
    }

    const result = validatePlay(
      state.hands[seatNo],
      cards,
      state.lastPlay,
      state.levelRank,
    );

    if (!result.valid) {
      set({ error: result.error || '无效出牌' });
      return;
    }

    // 从手牌移除
    const newHands = state.hands.map((h) => [...h]);
    for (const card of cards) {
      const idx = newHands[seatNo].findIndex(
        (c) => c.suit === card.suit && c.rank === card.rank && c.value === card.value,
      );
      if (idx !== -1) newHands[seatNo].splice(idx, 1);
    }

    const classified = classifyHand(cards, state.levelRank)!;

    const newRecent = [
      { turnNo: state.turnNo, seatNo, type: 'play' as const, cards: [...cards] },
      ...state.recentTurns,
    ].slice(0, 8);

    // 检查手牌清空
    const newRankings = [...state.rankings];
    if (newHands[seatNo].length === 0 && !newRankings.includes(seatNo)) {
      newRankings.push(seatNo);
    }

    // 下一位出牌者（跳过已出完的）
    let next = nextSeat(seatNo);
    let loopCount = 0;
    while (newHands[next].length === 0 && loopCount < 4) {
      next = nextSeat(next);
      loopCount++;
    }

    set({
      hands: newHands,
      currentSeat: next,
      lastPlay: { seatNo, type: classified.type, cards: [...cards] },
      passCount: 0,
      recentTurns: newRecent,
      rankings: newRankings,
      turnNo: state.turnNo + 1,
      error: null,
    });

    if (newRankings.length >= 3) {
      const remaining = [0, 1, 2, 3].find((s) => !newRankings.includes(s))!;
      get().finishGame([...newRankings, remaining]);
    }
  },

  passTurn: (seatNo: number) => {
    const state = get();
    if (state.phase !== 'playing') return;
    if (seatNo !== state.currentSeat) {
      set({ error: '不是你的回合' });
      return;
    }
    if (!state.lastPlay) {
      set({ error: '领牌者不能过牌' });
      return;
    }
    if (!canPass(true)) {
      set({ error: '不能过牌' });
      return;
    }

    const newPassCount = state.passCount + 1;
    const playSeat = state.lastPlay.seatNo;
    const { newRound, leader } = resolveNewRound(newPassCount, playSeat);

    // 计算下一位玩家
    let next: number;
    if (newRound) {
      next = leader;
      let loopCount = 0;
      while (state.hands[next].length === 0 && loopCount < 4) {
        next = nextSeat(next);
        loopCount++;
      }
    } else {
      next = nextSeat(seatNo);
      let loopCount = 0;
      while (state.hands[next].length === 0 && loopCount < 4) {
        next = nextSeat(next);
        loopCount++;
      }
    }

    const newRecent = [
      { turnNo: state.turnNo, seatNo, type: 'pass' as const },
      ...state.recentTurns,
    ].slice(0, 8);

    set({
      currentSeat: next,
      passCount: newRound ? 0 : newPassCount,
      lastPlay: newRound ? null : state.lastPlay,
      recentTurns: newRecent,
      turnNo: state.turnNo + 1,
      error: null,
    });
  },

  handleRemotePlay: (seatNo: number, cards: Card[]) => {
    const state = get();
    if (state.phase !== 'playing') return;

    const newHands = state.hands.map((h) => [...h]);
    for (const card of cards) {
      const idx = newHands[seatNo].findIndex(
        (c) => c.suit === card.suit && c.rank === card.rank && c.value === card.value,
      );
      if (idx !== -1) newHands[seatNo].splice(idx, 1);
    }

    const classified = classifyHand(cards, state.levelRank)!;
    const newRecent = [
      { turnNo: state.turnNo, seatNo, type: 'play' as const, cards: [...cards] },
      ...state.recentTurns,
    ].slice(0, 8);

    const newRankings = [...state.rankings];
    if (newHands[seatNo].length === 0 && !newRankings.includes(seatNo)) {
      newRankings.push(seatNo);
    }

    let next = nextSeat(seatNo);
    let loopCount = 0;
    while (newHands[next].length === 0 && loopCount < 4) {
      next = nextSeat(next);
      loopCount++;
    }

    set({
      hands: newHands,
      currentSeat: next,
      lastPlay: { seatNo, type: classified.type, cards: [...cards] },
      passCount: 0,
      recentTurns: newRecent,
      rankings: newRankings,
      turnNo: state.turnNo + 1,
      error: null,
    });

    if (newRankings.length >= 3) {
      const remaining = [0, 1, 2, 3].find((s) => !newRankings.includes(s))!;
      get().finishGame([...newRankings, remaining]);
    }
  },

  handleRemotePass: (seatNo: number) => {
    const state = get();
    if (state.phase !== 'playing') return;
    if (!state.lastPlay) return;

    const newPassCount = state.passCount + 1;
    const playSeat = state.lastPlay.seatNo;
    const { newRound, leader } = resolveNewRound(newPassCount, playSeat);

    let next: number;
    if (newRound) {
      next = leader;
      let loopCount = 0;
      while (state.hands[next].length === 0 && loopCount < 4) {
        next = nextSeat(next);
        loopCount++;
      }
    } else {
      next = nextSeat(seatNo);
      let loopCount = 0;
      while (state.hands[next].length === 0 && loopCount < 4) {
        next = nextSeat(next);
        loopCount++;
      }
    }

    const newRecent = [
      { turnNo: state.turnNo, seatNo, type: 'pass' as const },
      ...state.recentTurns,
    ].slice(0, 8);

    set({
      currentSeat: next,
      passCount: newRound ? 0 : newPassCount,
      lastPlay: newRound ? null : state.lastPlay,
      recentTurns: newRecent,
      turnNo: state.turnNo + 1,
      error: null,
    });
  },

  /** 游戏结束，计算升级并保存最终排名 */
  finishGame: (finalRankings: number[]) => {
    const state = get();
    if (state.phase !== 'playing') return;
    const upgrade = calculateUpgrade(finalRankings);
    const newLevelRank = Math.min(state.levelRank + upgrade, 14);
    const isFinalVictory = state.levelRank >= 14;

    // 更新获胜团队等级
    const winningTeam = finalRankings[0] % 2; // 0=队A(0,2), 1=队B(1,3)
    const newTeamLevels: [number, number] = [...state.teamLevels];
    newTeamLevels[winningTeam] = newLevelRank;

    set({
      phase: 'finished',
      finalRankings,
      upgrade,
      levelRank: newLevelRank,
      teamLevels: newTeamLevels,
      rankings: finalRankings,
      isFinalVictory,
      error: null,
    });
  },

  /** 开始下一局（保留级牌和局数，执行进贡） */
  startNextRound: () => {
    const state = get();
    const deck = shuffle(createDeck());
    let hands = deal(deck);

    // 进贡流程
    const pairs = determineTributePairs(state.finalRankings);
    const resistSeats: number[] = [];

    if (pairs.length > 0 && state.finalRankings.length === 4) {
      for (const pair of pairs) {
        if (canResistTribute(hands[pair.from])) {
          resistSeats.push(pair.from);
          continue;
        }
        const tributeCard = getTributeCard(hands[pair.from]);
        const returnCard = getReturnCard(hands[pair.to]);

        if (tributeCard) {
          const idx = hands[pair.from].findIndex(
            (c) => c.suit === tributeCard.suit && c.value === tributeCard.value
          );
          if (idx !== -1) {
            hands[pair.from].splice(idx, 1);
            hands[pair.to].push(tributeCard);
          }
        }
        if (returnCard) {
          const idx = hands[pair.to].findIndex(
            (c) => c.suit === returnCard.suit && c.value === returnCard.value
          );
          if (idx !== -1) {
            hands[pair.to].splice(idx, 1);
            hands[pair.from].push(returnCard);
          }
        }
      }
    }

    // 进贡后重新排序手牌
    hands = hands.map(sortHands);

    // 进贡局由头游先出
    const leader = state.finalRankings[0] ?? Math.floor(Math.random() * 4);

    set({
      phase: 'playing',
      hands,
      currentSeat: leader,
      turnNo: 1,
      lastPlay: null,
      passCount: 0,
      recentTurns: [],
      rankings: [],
      upgrade: 0,
      finalRankings: [],
      roundNumber: state.roundNumber + 1,
      tributeInfo: pairs.length > 0
        ? { pairs, resistSeats, processed: true }
        : null,
      error: null,
    });
  },

  /** 完全重置（新游戏，级牌回到2） */
  resetGame: () => {
    set({
      phase: 'idle',
      hands: [[], [], [], []],
      currentSeat: 0,
      turnNo: 0,
      lastPlay: null,
      passCount: 0,
      recentTurns: [],
      levelRank: 2,
      rankings: [],
      upgrade: 0,
      finalRankings: [],
      roundNumber: 1,
      isFinalVictory: false,
      tributeInfo: null,
      error: null,
    });
  },
}));
