import { describe, it, expect, beforeEach, vi } from 'vitest';
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

  it('handleRemotePass 连续3人过牌→新轮次 leader 领牌', () => {
    const card = { suit: 'spade' as const, rank: '3', value: 3 };
    useGameStore.setState({
      phase: 'playing',
      hands: [
        [card],
        [{ suit: 'heart' as const, rank: '4', value: 4 }],
        [{ suit: 'club' as const, rank: '5', value: 5 }],
        [{ suit: 'diamond' as const, rank: '6', value: 6 }],
      ],
      currentSeat: 0,
      lastPlay: { seatNo: 1, type: 'single', cards: [{ suit: 'heart' as const, rank: '4', value: 4 }] },
      passCount: 2,
      turnNo: 5,
      recentTurns: [],
    });

    useGameStore.getState().handleRemotePass(0);
    const after = useGameStore.getState();
    expect(after.currentSeat).toBe(1); // leader = lastPlay.seatNo
    expect(after.passCount).toBe(0);
    expect(after.lastPlay).toBeNull();
    expect(after.turnNo).toBe(6);
  });

  it('handleRemotePass 下一位已出完→跳过空手牌玩家', () => {
    const card = { suit: 'spade' as const, rank: '3', value: 3 };
    useGameStore.setState({
      phase: 'playing',
      hands: [
        [card],
        [{ suit: 'heart' as const, rank: '4', value: 4 }],
        [{ suit: 'club' as const, rank: '5', value: 5 }],
        [], // seat 3 已出完
      ],
      currentSeat: 0,
      lastPlay: { seatNo: 1, type: 'single', cards: [{ suit: 'heart' as const, rank: '4', value: 4 }] },
      passCount: 0,
      turnNo: 5,
      recentTurns: [],
    });

    useGameStore.getState().handleRemotePass(0);
    const after = useGameStore.getState();
    // nextSeat(0)=3 但 hand[3] 为空 → 跳过 → nextSeat(3)=2
    expect(after.currentSeat).toBe(2);
  });

  it('handleRemotePass phase 非 playing 直接返回', () => {
    useGameStore.setState({
      phase: 'idle',
      hands: [[], [], [], []],
      lastPlay: { seatNo: 1, type: 'single', cards: [{ suit: 'heart' as const, rank: '4', value: 4 }] },
      passCount: 0,
    });
    const before = useGameStore.getState().turnNo;

    useGameStore.getState().handleRemotePass(0);
    expect(useGameStore.getState().turnNo).toBe(before); // 未改变
  });

  it('handleRemotePass 没有 lastPlay 直接返回', () => {
    useGameStore.setState({
      phase: 'playing',
      hands: [[{ suit: 'spade' as const, rank: '3', value: 3 }], [], [], []],
      lastPlay: null,
      passCount: 0,
    });
    const before = useGameStore.getState().turnNo;

    useGameStore.getState().handleRemotePass(0);
    expect(useGameStore.getState().turnNo).toBe(before);
  });

  it('startNextRound 从 finished 状态开始下一局并处理进贡', () => {
    useGameStore.getState().startGame();
    useGameStore.getState().finishGame([0, 1, 2, 3]);
    const prevRound = useGameStore.getState().roundNumber;

    useGameStore.getState().startNextRound();
    const state = useGameStore.getState();
    expect(state.phase).toBe('playing');
    expect(state.turnNo).toBe(1);
    expect(state.roundNumber).toBe(prevRound + 1);
    expect(state.lastPlay).toBeNull();
    expect(state.passCount).toBe(0);
    expect(state.rankings).toEqual([]);
    // 进贡信息应被设置
    expect(state.tributeInfo).not.toBeNull();
    if (state.tributeInfo) {
      expect(state.tributeInfo.processed).toBe(true);
    }
  });

  it('playCards 阶段非 playing 直接返回', () => {
    useGameStore.setState({
      phase: 'idle',
      hands: [[], [], [], []],
      currentSeat: 0,
      lastPlay: null,
    });
    const before = useGameStore.getState().turnNo;

    useGameStore.getState().playCards(0, []);
    expect(useGameStore.getState().turnNo).toBe(before);
  });

  it('finishGame 阶段非 playing 直接返回', () => {
    useGameStore.setState({ phase: 'idle' });

    useGameStore.getState().finishGame([0, 1, 2, 3]);
    expect(useGameStore.getState().phase).toBe('idle');
  });

  it('handleRemotePlay 阶段非 playing 直接返回', () => {
    useGameStore.setState({
      phase: 'idle',
      hands: [[], [], [], []],
      turnNo: 1,
    });
    const before = useGameStore.getState().turnNo;

    useGameStore.getState().handleRemotePlay(0, []);
    expect(useGameStore.getState().turnNo).toBe(before);
  });

  it('handleRemotePlay 清空手牌后触发 finishGame', () => {
    const card = { suit: 'spade' as const, rank: '3', value: 3 };
    useGameStore.setState({
      phase: 'playing',
      hands: [
        [card],
        [],
        [],
        [{ suit: 'heart' as const, rank: '4', value: 4 }],
      ],
      currentSeat: 0,
      lastPlay: null,
      passCount: 0,
      turnNo: 1,
      rankings: [1, 2], // seat 1 和 2 已出完
      recentTurns: [],
    });

    useGameStore.getState().handleRemotePlay(0, [card]);
    const state = useGameStore.getState();
    expect(state.phase).toBe('finished');
    expect(state.finalRankings).toHaveLength(4);
  });

  it('handleRemotePlay 下一位已出完→跳过空手牌', () => {
    const card = { suit: 'spade' as const, rank: '3', value: 3 };
    useGameStore.setState({
      phase: 'playing',
      hands: [
        [{ suit: 'spade' as const, rank: '3', value: 3 }, { suit: 'heart' as const, rank: '4', value: 4 }],
        [],
        [{ suit: 'club' as const, rank: '5', value: 5 }],
        [{ suit: 'diamond' as const, rank: '6', value: 6 }],
      ],
      currentSeat: 0,
      lastPlay: null,
      passCount: 0,
      turnNo: 1,
      rankings: [1], // seat 1 已出完
      recentTurns: [],
    });

    useGameStore.getState().handleRemotePlay(0, [card]);
    const after = useGameStore.getState();
    // nextSeat(0)=3, hand[3] 非空 → 停在 3
    // 但如果 hand[3] 也是空的呢...
    expect(after.currentSeat).toBe(3); // hand[1] 空但 loop 开始从 next=nextSeat(0)=3，3 非空
  });

  it('handleRemotePlay 下一位空→跳过', () => {
    const card = { suit: 'spade' as const, rank: '3', value: 3 };
    useGameStore.setState({
      phase: 'playing',
      hands: [
        [{ suit: 'spade' as const, rank: '3', value: 3 }, { suit: 'heart' as const, rank: '4', value: 4 }],
        [],
        [{ suit: 'club' as const, rank: '5', value: 5 }],
        [], // seat 3 空
      ],
      currentSeat: 0,
      lastPlay: null,
      passCount: 0,
      turnNo: 1,
      rankings: [1, 3], // seats 1, 3 已出完
      recentTurns: [],
    });

    useGameStore.getState().handleRemotePlay(0, [card]);
    const after = useGameStore.getState();
    // nextSeat(0)=3 空 → nextSeat(3)=2 非空
    expect(after.currentSeat).toBe(2);
  });

  it('passTurn 领牌者不能过牌', () => {
    useGameStore.setState({
      phase: 'playing',
      hands: [
        [{ suit: 'spade' as const, rank: '3', value: 3 }],
        [{ suit: 'heart' as const, rank: '4', value: 4 }],
        [{ suit: 'club' as const, rank: '5', value: 5 }],
        [{ suit: 'diamond' as const, rank: '6', value: 6 }],
      ],
      currentSeat: 0,
      lastPlay: null, // 没有上家出牌 → 领牌者
      passCount: 0,
    });

    useGameStore.getState().passTurn(0);
    expect(useGameStore.getState().error).toBe('领牌者不能过牌');
  });

  it('passTurn 连续3人过牌→新轮次', () => {
    const card = { suit: 'spade' as const, rank: '3', value: 3 };
    useGameStore.setState({
      phase: 'playing',
      hands: [
        [card],
        [{ suit: 'heart' as const, rank: '4', value: 4 }],
        [{ suit: 'club' as const, rank: '5', value: 5 }],
        [{ suit: 'diamond' as const, rank: '6', value: 6 }],
      ],
      currentSeat: 0,
      lastPlay: { seatNo: 1, type: 'single', cards: [{ suit: 'heart' as const, rank: '4', value: 4 }] },
      passCount: 2,
      turnNo: 5,
      recentTurns: [],
    });

    useGameStore.getState().passTurn(0);
    const after = useGameStore.getState();
    expect(after.currentSeat).toBe(1); // leader
    expect(after.passCount).toBe(0);
    expect(after.lastPlay).toBeNull();
  });

  it('passTurn 下一位已出完→跳过', () => {
    const card = { suit: 'spade' as const, rank: '3', value: 3 };
    useGameStore.setState({
      phase: 'playing',
      hands: [
        [card],
        [{ suit: 'heart' as const, rank: '4', value: 4 }],
        [{ suit: 'club' as const, rank: '5', value: 5 }],
        [], // seat 3 已出完
      ],
      currentSeat: 0,
      lastPlay: { seatNo: 1, type: 'single', cards: [{ suit: 'heart' as const, rank: '4', value: 4 }] },
      passCount: 0,
      turnNo: 5,
      recentTurns: [],
    });

    useGameStore.getState().passTurn(0);
    const after = useGameStore.getState();
    // nextSeat(0)=3 空 → nextSeat(3)=2
    expect(after.currentSeat).toBe(2);
  });

  it('passTurn 非当前玩家不能过牌', () => {
    const card = { suit: 'spade' as const, rank: '3', value: 3 };
    useGameStore.setState({
      phase: 'playing',
      hands: [
        [card],
        [{ suit: 'heart' as const, rank: '4', value: 4 }],
        [{ suit: 'club' as const, rank: '5', value: 5 }],
        [{ suit: 'diamond' as const, rank: '6', value: 6 }],
      ],
      currentSeat: 0,
      lastPlay: { seatNo: 3, type: 'single', cards: [{ suit: 'diamond' as const, rank: '6', value: 6 }] },
      passCount: 0,
    });

    useGameStore.getState().passTurn(1); // seat 1 不是 currentSeat
    expect(useGameStore.getState().error).toBe('不是你的回合');
  });

  it('playCards 出不在手牌中的牌返回错误', () => {
    useGameStore.setState({
      phase: 'playing',
      hands: [
        [{ suit: 'spade' as const, rank: '3', value: 3 }],
        [{ suit: 'heart' as const, rank: '4', value: 4 }],
        [],
        [],
      ],
      currentSeat: 0,
      lastPlay: null,
    });

    useGameStore.getState().playCards(0, [{ suit: 'club' as const, rank: '8', value: 8 }]);
    expect(useGameStore.getState().error).not.toBeNull();
  });

  it('playCards 下一位已出完→跳过空手牌', () => {
    const card = { suit: 'spade' as const, rank: '3', value: 3 };
    useGameStore.setState({
      phase: 'playing',
      hands: [
        [{ suit: 'spade' as const, rank: '3', value: 3 }, { suit: 'heart' as const, rank: '4', value: 4 }],
        [],
        [{ suit: 'club' as const, rank: '5', value: 5 }],
        [], // seat 3 空
      ],
      currentSeat: 0,
      lastPlay: null,
      passCount: 0,
      turnNo: 1,
      rankings: [1, 3],
      recentTurns: [],
    });

    useGameStore.getState().playCards(0, [card]);
    const after = useGameStore.getState();
    // nextSeat(0)=3 空 → nextSeat(3)=2
    expect(after.currentSeat).toBe(2);
  });

  it('playCards 第三名清空手牌触发结算', () => {
    const card = { suit: 'spade' as const, rank: '3', value: 3 };
    useGameStore.setState({
      phase: 'playing',
      hands: [
        [card],
        [],
        [],
        [{ suit: 'heart' as const, rank: '4', value: 4 }],
      ],
      currentSeat: 0,
      lastPlay: null,
      passCount: 0,
      turnNo: 1,
      rankings: [1, 2],
      recentTurns: [],
    });

    useGameStore.getState().playCards(0, [card]);
    const state = useGameStore.getState();
    expect(state.phase).toBe('finished');
    expect(state.finalRankings).toHaveLength(4);
  });

  it('passTurn 新轮次 leader 手牌已空→跳过空手牌', () => {
    useGameStore.setState({
      phase: 'playing',
      hands: [
        [{ suit: 'spade' as const, rank: '3', value: 3 }],
        [], // 已出完，是 lastPlay 的玩家
        [{ suit: 'club' as const, rank: '5', value: 5 }],
        [{ suit: 'diamond' as const, rank: '6', value: 6 }],
      ],
      currentSeat: 0,
      lastPlay: { seatNo: 1, type: 'single', cards: [{ suit: 'heart' as const, rank: '4', value: 4 }] },
      passCount: 2,
      turnNo: 5,
      recentTurns: [],
      rankings: [1],
    });

    useGameStore.getState().passTurn(0);
    const after = useGameStore.getState();
    // leader=1(空)→对家=(1+2)%4=3(有牌)→next=3
    expect(after.currentSeat).toBe(3);
    expect(after.passCount).toBe(0);
    expect(after.lastPlay).toBeNull();
    expect(after.turnNo).toBe(6);
  });

  it('handleRemotePass 新轮次 leader 手牌已空→跳过空手牌', () => {
    useGameStore.setState({
      phase: 'playing',
      hands: [
        [{ suit: 'spade' as const, rank: '3', value: 3 }],
        [],
        [{ suit: 'club' as const, rank: '5', value: 5 }],
        [{ suit: 'diamond' as const, rank: '6', value: 6 }],
      ],
      currentSeat: 0,
      lastPlay: { seatNo: 1, type: 'single', cards: [{ suit: 'heart' as const, rank: '4', value: 4 }] },
      passCount: 2,
      turnNo: 5,
      recentTurns: [],
      rankings: [1],
    });

    useGameStore.getState().handleRemotePass(0);
    const after = useGameStore.getState();
    // leader=1(空)→对家=(1+2)%4=3(有牌)→next=3
    expect(after.currentSeat).toBe(3);
    expect(after.passCount).toBe(0);
    expect(after.lastPlay).toBeNull();
    expect(after.turnNo).toBe(6);
  });

  it('passTurn 新轮次 leader 和下一家都空→跳过多个空手牌', () => {
    useGameStore.setState({
      phase: 'playing',
      hands: [
        [],
        [],
        [{ suit: 'club' as const, rank: '5', value: 5 }],
        [{ suit: 'spade' as const, rank: '3', value: 3 }],
      ],
      currentSeat: 3,
      lastPlay: { seatNo: 1, type: 'single', cards: [{ suit: 'heart' as const, rank: '4', value: 4 }] },
      passCount: 2,
      turnNo: 5,
      recentTurns: [],
      rankings: [0, 1],
    });

    useGameStore.getState().passTurn(3);
    const after = useGameStore.getState();
    // leader=1(空)→对家=3(有牌)→next=3
    expect(after.currentSeat).toBe(3);
    expect(after.passCount).toBe(0);
    expect(after.lastPlay).toBeNull();
  });
});
