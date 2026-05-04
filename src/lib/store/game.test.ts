import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './game';

describe('GameStore', () => {
  beforeEach(() => {
    useGameStore.setState({
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
    });
  });

  it('初始状态为 idle', () => {
    const state = useGameStore.getState();
    expect(state.phase).toBe('idle');
    expect(state.hands).toHaveLength(4);
    expect(state.levelRank).toBe(2);
    expect(state.roundNumber).toBe(1);
  });

  it('startGame 切换到 playing 并分发手牌', () => {
    useGameStore.getState().startGame();
    const state = useGameStore.getState();
    expect(state.phase).toBe('playing');
    expect(state.hands.every((h) => h.length > 0)).toBe(true);
    expect(state.roundNumber).toBe(1);
  });

  it('playCards 移除手牌并更新回合', () => {
    useGameStore.getState().startGame();
    const state = useGameStore.getState();
    const seatNo = state.currentSeat;
    const cards = state.hands[seatNo].slice(0, 1);
    const beforeCount = state.hands[seatNo].length;

    useGameStore.getState().playCards(seatNo, cards);
    const after = useGameStore.getState();
    expect(after.hands[seatNo].length).toBe(beforeCount - 1);
  });

  it('非当前玩家出牌返回错误', () => {
    useGameStore.getState().startGame();
    const state = useGameStore.getState();
    const wrongSeat = (state.currentSeat + 1) % 4;
    const cards = state.hands[wrongSeat].slice(0, 1);

    useGameStore.getState().playCards(wrongSeat, cards);
    expect(useGameStore.getState().error).not.toBeNull();
  });

  it('passTurn 增加回合', () => {
    useGameStore.getState().startGame();
    const state = useGameStore.getState();
    // 先让当前玩家出牌（创建 lastPlay），下一家才能过牌
    const seatLeader = state.currentSeat;
    const playCards = state.hands[seatLeader].slice(0, 1);
    useGameStore.getState().playCards(seatLeader, playCards);
    const nextSeat = useGameStore.getState().currentSeat;
    const turn = useGameStore.getState().turnNo;

    useGameStore.getState().passTurn(nextSeat);
    expect(useGameStore.getState().turnNo).toBeGreaterThan(turn);
  });

  it('finishGame 切换到 finished 状态', () => {
    useGameStore.getState().startGame();
    useGameStore.getState().finishGame([0, 1, 2, 3]);
    const state = useGameStore.getState();
    expect(state.phase).toBe('finished');
    expect(state.finalRankings).toEqual([0, 1, 2, 3]);
  });

  it('startNextRound 保留级牌并递增 roundNumber', () => {
    useGameStore.getState().startGame();
    useGameStore.getState().finishGame([0, 1, 2, 3]);
    const prevLevel = useGameStore.getState().levelRank;
    const prevRound = useGameStore.getState().roundNumber;

    useGameStore.getState().startNextRound();
    const state = useGameStore.getState();
    expect(state.roundNumber).toBe(prevRound + 1);
    expect(state.phase).toBe('playing');
    // 级牌应保留或升级
    expect(state.levelRank).toBeGreaterThanOrEqual(prevLevel);
  });

  it('resetGame 恢复初始状态', () => {
    useGameStore.getState().startGame();
    useGameStore.getState().finishGame([0, 1, 2, 3]);
    useGameStore.getState().resetGame();
    const state = useGameStore.getState();
    expect(state.phase).toBe('idle');
    expect(state.roundNumber).toBe(1);
    expect(state.levelRank).toBe(2);
  });

  it('handleRemotePlay 处理远端玩家出牌', () => {
    useGameStore.getState().startGame();
    const state = useGameStore.getState();
    const seatNo = state.currentSeat;
    const cards = state.hands[seatNo].slice(0, 1);
    const beforeCount = state.hands[seatNo].length;

    useGameStore.getState().handleRemotePlay(seatNo, cards);
    expect(useGameStore.getState().hands[seatNo].length).toBe(beforeCount - 1);
  });

  it('handleRemotePass 处理远端玩家过牌', () => {
    useGameStore.getState().startGame();
    const state = useGameStore.getState();
    // 先让当前玩家出牌（创建 lastPlay），下一家才能过牌
    const seatLeader = state.currentSeat;
    const playCards = state.hands[seatLeader].slice(0, 1);
    useGameStore.getState().handleRemotePlay(seatLeader, playCards);
    const nextSeat = useGameStore.getState().currentSeat;
    const turn = useGameStore.getState().turnNo;

    useGameStore.getState().handleRemotePass(nextSeat);
    expect(useGameStore.getState().turnNo).toBeGreaterThan(turn);
  });
});
