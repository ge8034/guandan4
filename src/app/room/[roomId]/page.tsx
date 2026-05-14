'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PlayerSeat } from '@/components/game/PlayerSeat';
import { TableArea } from '@/components/game/TableArea';
import { HandArea } from '@/components/game/HandArea';
import { PlayingCard } from '@/components/game/PlayingCard';
import { ActionBar } from '@/components/game/ActionBar';
import { GameStatusBar } from '@/components/game/GameStatusBar';
import { Scoreboard } from '@/components/game/Scoreboard';
import { TurnTimer } from '@/components/game/TurnTimer';
import { DealAnimation } from '@/components/game/DealAnimation';
import { Button } from '@/components/ui/Button';
import { useGameStore } from '@/lib/store/game';
import { useRoomStore } from '@/lib/store/room';
import { useRealtime } from '@/lib/hooks/useRealtime';
import { useSound } from '@/lib/hooks/useSound';
import { persistTurn } from '@/lib/game/supabase-bridge';
import { aiDecide } from '@/lib/game/ai';
import { classifyHand } from '@/lib/game/rules';
import type { Card } from '@/lib/game/types';
import type { GamePhase } from '@/lib/game/types';
import type { GameEvent } from '@/lib/supabase/realtime';

const playerNames = ['范总', '鞠局', '许局', '潘金莲'];

/** 牌背：完全不透明蓝底+十字星图案 */
function CardBacks({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <div className="w-11 h-16 rounded-md shadow-sm flex items-center justify-center shrink-0"
      style={{ backgroundColor: '#1d4ed8', border: '2px solid #3b82f6' }}>
      <div className="w-8 h-12 rounded flex items-center justify-center"
        style={{ backgroundColor: '#2563eb', border: '1px solid rgba(147,197,253,0.5)' }}>
        <svg viewBox="0 0 24 24" width="20" height="20">
          <rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="#93c5fd" strokeWidth="1.5" />
          <line x1="12" y1="5" x2="12" y2="19" stroke="#93c5fd" strokeWidth="1" />
          <line x1="5" y1="12" x2="19" y2="12" stroke="#93c5fd" strokeWidth="1" />
        </svg>
      </div>
    </div>
  );
}

/** 紧凑 AI 手牌行（横向） */
function CompactHand({ cards, levelRank }: { cards: Card[]; levelRank?: number }) {
  if (!cards || cards.length === 0) return null;
  return (
    <div className="flex gap-0 min-w-max px-1">
      {cards.map((card, i) => (
        <div key={i} className="shrink-0" style={{ marginLeft: i > 0 ? 'var(--card-overlap)' : '0', zIndex: i }}>
          <PlayingCard card={card} size="md" levelRank={levelRank} />
        </div>
      ))}
    </div>
  );
}

/** 骨架加载状态 */
function RoomSkeleton() {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex flex-col">
        <div className="mx-auto w-full max-w-7xl px-2 pt-2">
          <div className="h-10 rounded-lg bg-neutral-800/50 animate-pulse" />
        </div>
        <div className="mx-auto w-full max-w-7xl px-2 py-1 flex-1 flex flex-col">
          <div className="poker-table-bg poker-table-border flex-1 flex flex-col items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="flex gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="card-skeleton card-skeleton-sm" />
                ))}
              </div>
              <p className="text-sm text-white/40">正在连接房间...</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const {
    phase, hands, currentSeat, turnNo, recentTurns, lastPlay,
    levelRank, rankings, roundNumber, tributeInfo, error,
    startGame, playCards, passTurn,
    handleRemotePlay, handleRemotePass,
  } = useGameStore();

  const { mySeat, currentRoomId, userId, init: initRoom, join: joinRoom } = useRoomStore();

  const sound = useSound();

  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [playingIndices, setPlayingIndices] = useState<Set<number>>(new Set());
  const [lockedGroups, setLockedGroups] = useState<Card[][]>([]);
  const [gameId] = useState(() => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
  const [connected, setConnected] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [dealAnimation, setDealAnimation] = useState(false);
  const [bombFlash, setBombFlash] = useState(false);
  const [victoryEffect, setVictoryEffect] = useState(false);
  const prevPhaseRef = useRef<GamePhase>(phase);
  const reportedRef = useRef<Set<number>>(new Set());
  const speechWarmedRef = useRef(false);

  // 首次用户交互时预热语音 API（浏览器要求用户手势后才能播放语音）
  const warmupSpeech = () => {
    if (speechWarmedRef.current) return;
    speechWarmedRef.current = true;
    const u = new SpeechSynthesisUtterance('');
    u.volume = 0;
    speechSynthesis.speak(u);
  };

  // 手机横屏自动旋转
  useEffect(() => {
    const check = () => {
      const isLandscape = window.innerWidth <= 1023 && window.innerWidth > window.innerHeight;
      document.documentElement.classList.toggle('is-landscape', isLandscape);
      console.log('[横屏]', window.innerWidth, 'x', window.innerHeight, isLandscape ? 'LANDSCAPE' : 'portrait', 'class:', document.documentElement.classList.contains('is-landscape'));
    };
    check();
    if (screen?.orientation) {
      screen.orientation.addEventListener('change', check);
    }
    window.addEventListener('resize', check);
    return () => {
      if (screen?.orientation) {
        screen.orientation.removeEventListener('change', check);
      }
      window.removeEventListener('resize', check);
    };
  }, []);

  // 暴露 store 到 window（供 E2E 测试访问）
  if (typeof window !== 'undefined') (window as any).__gameStore = useGameStore;

  // 初始化
  useEffect(() => {
    if (phase === 'idle') startGame();
    setConnected(true);
    setInitializing(false);

    async function backgroundAuth() {
      try {
        if (!userId) await initRoom();
        if (currentRoomId !== roomId) await joinRoom(roomId);
      } catch { /* 离线模式 */ }
    }
    backgroundAuth();
  }, []);

  // 游戏结束 → 特效 + 跳转结算页
  useEffect(() => {
    if (phase === 'finished') {
      setVictoryEffect(true);
      sound.playVictory();
      const timer = setTimeout(() => {
        router.push(`/room/${roomId}/result`);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [phase, roomId, router, sound]);

  // Broadcast 事件处理
  const handleRemoteEvent = useCallback(
    (event: GameEvent) => {
      if (event.type === 'play') {
        handleRemotePlay(event.seatNo, event.cards);
      } else if (event.type === 'pass') {
        handleRemotePass(event.seatNo);
      }
    },
    [handleRemotePlay, handleRemotePass],
  );

  const { send } = useRealtime(roomId, handleRemoteEvent);

  useEffect(() => {
    if (roomId && mySeat !== null) setConnected(true);
  }, [roomId, mySeat]);

  const effectiveMySeat = mySeat ?? 3;

  // 相对座位：上家(前一位) → 对家(对面队友) → 下家(后一位)
  // 出牌顺序逆时针：0→3→2→1→0，即 nextSeat = (seat+3)%4
  const shangjiaSeat = (effectiveMySeat + 1) % 4; // nextSeat(nextSeat(nextSeat(me)))
  const duijiaSeat = (effectiveMySeat + 2) % 4;   // 对面队友
  const xiajiaSeat = (effectiveMySeat + 3) % 4;   // nextSeat(me)

  // 发牌动画：检测 idle → playing 且为第一局
  useEffect(() => {
    if (prevPhaseRef.current === 'idle' && phase === 'playing' && roundNumber === 1) {
      setDealAnimation(true);
    }
    prevPhaseRef.current = phase;
  }, [phase, roundNumber]);

  // AI 自动出牌 — 使用 setInterval 轮询，避免 setTimeout 锁问题
  const lastAiActionRef = useRef<string>('');

  useEffect(() => {
    if (phase !== 'playing') return;

    const interval = setInterval(() => {
      const state = useGameStore.getState();
      if (state.phase !== 'playing') return;

      const seat = state.currentSeat;
      if (seat === effectiveMySeat) return; // 人类回合，跳过

      const actionKey = `${state.turnNo}_${seat}`;
      if (lastAiActionRef.current === actionKey) return; // 已处理过

      const aiHand = [...state.hands[seat]];
      const handLenBefore = aiHand.length;
      // 空手牌让流程继续：aiDecide 内部返回 pass，
      // handleRemotePass 经 skip-empty 修复后跳到下一位

      const lastPlayClassified = state.lastPlay
        ? classifyHand(state.lastPlay.cards, state.levelRank)
        : null;

      const prevTurnNo = state.turnNo;

      const decision = aiDecide(aiHand, lastPlayClassified, state.levelRank, {
        mySeat: seat,
        opponentHandSizes: state.hands.map((h) => h.length),
        lastPlaySeat: state.lastPlay?.seatNo,
      });

      if (decision.type === 'play') {
        handleRemotePlay(seat, decision.cards);
      } else {
        handleRemotePass(seat);
      }

      // 验证操作是否生效
      const newState = useGameStore.getState();
      if (newState.turnNo === prevTurnNo && newState.currentSeat === seat) {
        // 操作未生效：turnNo 和 currentSeat 都没变
        console.warn(
          `[AI] 操作未生效 seat=${seat} turnNo=${prevTurnNo} decision=${decision.type} handSize=${handLenBefore}`,
        );
        return; // 不上锁，下次轮询重试
      }

      // 操作生效，上锁防止重复处理
      lastAiActionRef.current = actionKey;
    }, 400);

    return () => clearInterval(interval);
  }, [phase, effectiveMySeat, handleRemotePlay, handleRemotePass]);

  const myHand = hands[effectiveMySeat] || [];

  const handleCardClick = useCallback(
    (index: number) => {
      if (currentSeat !== effectiveMySeat) return;
      warmupSpeech();
      sound.playSelect();

      // 检查是否属于锁定组：通过牌对象引用匹配
      const card = myHand[index];
      const group = card ? lockedGroups.find((g) => g.some((c) => c === card)) : undefined;
      if (group) {
        const groupIndices = group.map((c) => myHand.indexOf(c)).filter((i) => i !== -1);
        setSelectedIndices((prev) => {
          const next = new Set(prev);
          const allSelected = groupIndices.every((i) => prev.has(i));
          if (allSelected) {
            groupIndices.forEach((i) => next.delete(i));
          } else {
            groupIndices.forEach((i) => next.add(i));
          }
          return next;
        });
        return;
      }

      setSelectedIndices((prev) => {
        const next = new Set(prev);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        return next;
      });
    },
    [currentSeat, effectiveMySeat, sound, lockedGroups],
  );

  const handlePlay = useCallback(() => {
    const selected = Array.from(selectedIndices)
      .sort((a, b) => b - a)
      .map((i) => myHand[i])
      .filter(Boolean);
    if (selected.length === 0) return;

    // 触发飞出动画
    setPlayingIndices(new Set(selectedIndices));
    setSelectedIndices(new Set());

    // 动画结束后执行实际出牌
    setTimeout(() => {
      playCards(effectiveMySeat, selected);
      setPlayingIndices(new Set());
      // 更新锁牌（移除已打出的牌）
      updateLockedAfterPlay(selected);
      // 音效
      const classified = classifyHand(selected, levelRank);
      if (classified?.type === 'bomb' || classified?.type === 'rocket') {
        setBombFlash(true); setTimeout(() => setBombFlash(false), 300); sound.playBomb();
      } else {
        sound.playCard();
      }

      if (mySeat !== null) {
        send({ type: 'play', seatNo: mySeat, cards: selected, turnNo });
        persistTurn(roomId, gameId, turnNo, mySeat, 'play', selected);
      }
    }, 200);
  }, [selectedIndices, myHand, effectiveMySeat, mySeat, playCards, send, roomId, gameId, turnNo, sound]);

  const handlePass = useCallback(() => {
    passTurn(effectiveMySeat);
    setSelectedIndices(new Set());
    sound.playPass();

    if (mySeat !== null) {
      send({ type: 'pass', seatNo: mySeat, turnNo });
      persistTurn(roomId, gameId, turnNo, mySeat, 'pass');
    }
  }, [effectiveMySeat, mySeat, passTurn, send, roomId, gameId, turnNo, sound]);

  const handleDragSelect = useCallback((indices: number[]) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      indices.forEach((i) => next.add(i));
      return next;
    });
  }, []);

  const handleDeselectAll = useCallback(() => {
    setSelectedIndices(new Set());
  }, []);

  const handleHint = useCallback(() => {
    if (myHand.length > 0) setSelectedIndices(new Set([0]));
  }, [myHand]);

  // 锁牌：当前选中形成合法牌型
  const selectedCards = Array.from(selectedIndices)
    .sort((a, b) => b - a)
    .map((i) => myHand[i])
    .filter(Boolean);
  const selectedIsValid = selectedCards.length > 0 && classifyHand(selectedCards, levelRank) !== null;
  // 检查选中是否恰好是某个已锁定组
  const selectedIsLockedGroup = lockedGroups.some(
    (g) => g.length === selectedCards.length && g.every((c) => selectedCards.some((sc) => sc === c)),
  );
  const canLock = selectedIsValid && !selectedIsLockedGroup;
  const canUnlock = selectedIsLockedGroup;

  const handleLock = useCallback(() => {
    if (!canLock) return;
    setLockedGroups((prev) => [...prev, [...selectedCards]]);
    setSelectedIndices(new Set());
  }, [canLock, selectedCards]);

  const handleUnlock = useCallback(() => {
    if (!canUnlock) return;
    setLockedGroups((prev) => prev.filter((g) => !g.every((c) => selectedCards.some((sc) => sc === c))));
    setSelectedIndices(new Set());
  }, [canUnlock, selectedCards]);

  // 出牌后更新锁牌（移除已打出的牌对象）
  // 新一局开始时清除旧锁牌组（新牌对象引用不同）
  useEffect(() => {
    setLockedGroups([]);
  }, [roundNumber]);

  const updateLockedAfterPlay = useCallback((playedCards: Card[]) => {
    setLockedGroups((prev) =>
      prev
        .map((g) => g.filter((c) => !playedCards.some((pc) => pc === c)))
        .filter((g) => g.length > 0)
    );
  }, []);

  // 报牌：手牌 ≤ 7 张时公开数量并播报一次
  const handSizes = hands.map((h) => h.length);
  const showCount = (seat: number) => handSizes[seat] <= 7;
  const reportNames = playerNames.map((name, i) => {
    if (handSizes[i] > 7 || handSizes[i] === 0) return null;
    if (reportedRef.current.has(i)) return null;
    reportedRef.current.add(i);
    return `${name}还剩${handSizes[i]}张`;
  }).filter(Boolean) as string[];

  // 新一局重置报牌状态
  useEffect(() => {
    reportedRef.current = new Set();
  }, [roundNumber]);

  if (initializing || phase === 'idle' || !connected) {
    return <RoomSkeleton />;
  }

  const handScaleStyle = { transform: 'scale(var(--hand-scale))' } as React.CSSProperties;
  const handScaleMobile: React.CSSProperties = {
    transform: 'scale(var(--hand-scale-mobile))',
  };

  return (
    <div className="min-h-screen flex flex-col landscape-root">
      <main className="flex-1 flex flex-col landscape-main">
        <div className="mx-auto w-full max-w-7xl 2xl:max-w-[90rem] px-1 sm:px-2 pt-0.5 landscape-topbar">
          <Scoreboard
            roomName="联网对局"
            status={phase === 'finished' ? 'finished' : 'playing'}
            hasTribute={!!tributeInfo}
            resistCount={tributeInfo?.resistSeats?.length || 0}
            reportNames={reportNames.length > 0 ? reportNames : undefined}
          />
        </div>

        {/* ======= 牌桌 ======= */}
        <div className="mx-auto w-full max-w-7xl 2xl:max-w-[90rem] px-1 sm:px-2 flex-1 flex flex-col landscape-table-wrap relative">
          {/* GameStatusBar — 桌面端精简,移动端完整 */}
          <div className="absolute top-1 right-1 z-10 pointer-events-none">
            <div className="pointer-events-auto">
              <GameStatusBar
              status={phase === 'finished' ? 'finished' : 'playing'}
              levelRank={levelRank}
              turnNo={turnNo}
              roundCount={roundNumber}
              roomName="联网对局"
              hasTribute={!!tributeInfo}
              resistCount={tributeInfo?.resistSeats?.length || 0}
              reportNames={reportNames.length > 0 ? reportNames : undefined}
              compact
            />
            </div>
          </div>
          <div className="poker-table-bg poker-table-border flex-1 flex flex-col overflow-hidden relative landscape-table">
            <DealAnimation
              play={dealAnimation}
              onComplete={() => setDealAnimation(false)}
            />

            {/* 上方：对家 */}
            <div className="flex flex-col items-center pt-1 landscape-opponent">
              <div className={`overflow-x-auto max-w-full hidden sm:block`} style={handScaleStyle}>
                <CardBacks count={hands[duijiaSeat]?.length || 0} />
              </div>
              <PlayerSeat name={playerNames[duijiaSeat]} cardCount={hands[duijiaSeat]?.length || 0}
                isOnline={true} isCurrentTurn={currentSeat === duijiaSeat} isMe={false} showCount={showCount(duijiaSeat)}
                isAiThinking={currentSeat === duijiaSeat && duijiaSeat !== effectiveMySeat && phase === 'playing'} />
            </div>

            {/* 中间：上家(0) | 出牌区 | 下家(2) */}
            <div className="flex items-center justify-center px-0 gap-4 landscape-middle">
              {/* 左：上家 */}
              <div className="hidden sm:flex items-center self-stretch shrink-0 gap-2 landscape-left-player">
                <CardBacks count={hands[shangjiaSeat]?.length || 0} />
                <PlayerSeat name={playerNames[shangjiaSeat]} cardCount={hands[shangjiaSeat]?.length || 0}
                  isOnline={true} isCurrentTurn={currentSeat === shangjiaSeat} isMe={false} showCount={showCount(shangjiaSeat)}
                  isAiThinking={currentSeat === shangjiaSeat && shangjiaSeat !== effectiveMySeat && phase === 'playing'} />
              </div>

              {/* 移动端上家(简化为仅座位) */}
              <div className="flex sm:hidden items-center self-stretch shrink-0 landscape-left-player">
                <PlayerSeat name={playerNames[shangjiaSeat]} cardCount={hands[shangjiaSeat]?.length || 0}
                  isOnline={true} isCurrentTurn={currentSeat === shangjiaSeat} isMe={false} showCount={showCount(shangjiaSeat)}
                  isAiThinking={currentSeat === shangjiaSeat && shangjiaSeat !== effectiveMySeat && phase === 'playing'} />
              </div>

              {/* 中：牌桌出牌区 */}
              <div className="flex flex-col items-center justify-center min-h-[160px] sm:min-h-[200px] px-11 landscape-center-table gap-2">
                <TableArea recentTurns={recentTurns.slice(0, 2)} currentTurnSeat={currentSeat} effectiveMySeat={effectiveMySeat} lastPlay={lastPlay} />
                <TurnTimer />
              </div>

              {/* 移动端下家(简化为仅座位) */}
              <div className="flex sm:hidden items-center self-stretch shrink-0 landscape-right-player">
                <PlayerSeat name={playerNames[xiajiaSeat]} cardCount={hands[xiajiaSeat]?.length || 0}
                  isOnline={true} isCurrentTurn={currentSeat === xiajiaSeat} isMe={false} showCount={showCount(xiajiaSeat)}
                  isAiThinking={currentSeat === xiajiaSeat && xiajiaSeat !== effectiveMySeat && phase === 'playing'} />
              </div>

              {/* 右：下家 */}
              <div className="hidden sm:flex items-center self-stretch shrink-0 gap-2 landscape-right-player">
                <PlayerSeat name={playerNames[xiajiaSeat]} cardCount={hands[xiajiaSeat]?.length || 0}
                  isOnline={true} isCurrentTurn={currentSeat === xiajiaSeat} isMe={false} showCount={showCount(xiajiaSeat)}
                  isAiThinking={currentSeat === xiajiaSeat && xiajiaSeat !== effectiveMySeat && phase === 'playing'} />
                <CardBacks count={hands[xiajiaSeat]?.length || 0} />
              </div>
            </div>

            {/* 下方：人类 */}
            <div className="flex flex-col items-center pt-0 pb-0 landscape-self">
              <PlayerSeat name={playerNames[effectiveMySeat]} cardCount={myHand.length}
                isOnline={true} isCurrentTurn={currentSeat === effectiveMySeat} isMe={true} showCount={true} />
              {/* 桌面端：手牌+操作栏水平排列 */}
              <div className="hidden sm:flex items-center gap-3 mt-2 sm:mt-4 landscape-self">
                <div className="max-w-5xl px-0" style={{ transform: 'scale(var(--my-hand-scale))', transformOrigin: 'bottom center' }}>
                  <HandArea cards={myHand} lockedGroups={lockedGroups} onDragSelect={handleDragSelect} onDeselectAll={handleDeselectAll} levelRank={levelRank}
                    selectedCardIds={selectedIndices}
                    playingIndices={playingIndices}
                    disabled={currentSeat !== effectiveMySeat}
                    onCardClick={handleCardClick}
                    onPlayDoubleClick={handlePlay} />
                </div>
                <div className="shrink-0 glass-dark border border-white/10 rounded-lg landscape-actions">
                  <ActionBar
                    canPlay={currentSeat === effectiveMySeat}
                    selectedCount={selectedIndices.size}
                    onPlay={handlePlay}
                    onPass={handlePass}
                    onHint={handleHint}
                    canLock={canLock}
                    canUnlock={canUnlock}
                    onLock={handleLock}
                    onUnlock={handleUnlock}
                  />
                </div>
              </div>
              {/* 移动端手牌 */}
              <div className="w-full max-w-5xl px-0 mt-1 -mb-4 sm:hidden" style={{ transform: 'scale(var(--hand-scale-mobile))', transformOrigin: 'bottom center' }}>
                <HandArea cards={myHand} lockedGroups={lockedGroups} onDragSelect={handleDragSelect} onDeselectAll={handleDeselectAll} levelRank={levelRank}
                  selectedCardIds={selectedIndices}
                  playingIndices={playingIndices}
                  disabled={currentSeat !== effectiveMySeat}
                  onCardClick={handleCardClick}
                  onPlayDoubleClick={handlePlay} />
              </div>
            </div>

          </div>
          {/* 移动端操作栏 — 右下角悬浮 */}
          <div className="sm:hidden absolute bottom-0 right-0 z-[--z-sticky] glass-dark border-t border-l border-white/10 rounded-tl-lg landscape-actions">
            <ActionBar
              canPlay={currentSeat === effectiveMySeat}
              selectedCount={selectedIndices.size}
              onPlay={handlePlay}
              onPass={handlePass}
              onHint={handleHint}
              canLock={canLock}
              canUnlock={canUnlock}
              onLock={handleLock}
              onUnlock={handleUnlock}
            />
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mx-auto w-full max-w-7xl px-2">
            <p className="text-center text-xs text-red-400">{error}</p>
          </div>
        )}

        {/* 炸弹全屏闪光 */}
        {bombFlash && <div className="fixed inset-0 z-[500] pointer-events-none bomb-overlay animate-bomb-flash" />}

        {/* 胜利彩带 */}
        {victoryEffect && (
          <>
            <div className="fixed inset-0 z-[500] pointer-events-none flex items-center justify-center">
              <div className="victory-particle" style={{ left: '30%', backgroundColor: 'oklch(0.72 0.18 60)' }} />
              <div className="victory-particle" style={{ left: '45%', backgroundColor: 'oklch(0.55 0.22 280)', animationDelay: '0.15s' }} />
              <div className="victory-particle" style={{ left: '55%', backgroundColor: 'oklch(0.67 0.19 50)', animationDelay: '0.3s' }} />
              <div className="victory-particle" style={{ left: '40%', backgroundColor: 'oklch(0.72 0.18 60)', animationDelay: '0.1s' }} />
              <div className="victory-particle" style={{ left: '50%', backgroundColor: 'oklch(0.55 0.22 280)', animationDelay: '0.2s' }} />
              <div className="victory-particle" style={{ left: '60%', backgroundColor: 'oklch(0.67 0.19 50)', animationDelay: '0.25s' }} />
            </div>
          </>
        )}
      </main>
    </div>
  );
};
