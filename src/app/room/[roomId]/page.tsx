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

const playerNames = ['牌神', '掼蛋高手', '扑克达人', '我'];

/** 紧凑 AI 手牌行（横向） */
function CompactHand({ cards }: { cards: Card[] }) {
  if (!cards || cards.length === 0) return null;
  return (
    <div className="flex gap-0 min-w-max px-1">
      {cards.map((card, i) => (
        <div key={i} className="shrink-0" style={{ marginLeft: i > 0 ? 'var(--card-overlap)' : '0', zIndex: i }}>
          <PlayingCard card={card} size="md" />
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
    phase, hands, currentSeat, turnNo, recentTurns,
    levelRank, rankings, roundNumber, tributeInfo, error,
    startGame, playCards, passTurn,
    handleRemotePlay, handleRemotePass,
  } = useGameStore();

  const { mySeat, currentRoomId, userId, init: initRoom, join: joinRoom } = useRoomStore();

  const sound = useSound();

  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [playingIndices, setPlayingIndices] = useState<Set<number>>(new Set());
  const [gameId] = useState(() => crypto.randomUUID());
  const [connected, setConnected] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [dealAnimation, setDealAnimation] = useState(false);
  const prevPhaseRef = useRef<GamePhase>(phase);

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

  // 游戏结束 → 跳转结算页 + 胜利音效
  useEffect(() => {
    if (phase === 'finished') {
      sound.playVictory();
      router.push(`/room/${roomId}/result`);
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
      if (aiHand.length === 0) return;

      const lastPlayClassified = state.lastPlay
        ? classifyHand(state.lastPlay.cards, state.levelRank)
        : null;

      const decision = aiDecide(aiHand, lastPlayClassified, state.levelRank, {
        mySeat: seat,
        opponentHandSizes: state.hands.map((h) => h.length),
      });

      if (decision.type === 'play') {
        handleRemotePlay(seat, decision.cards);
      } else {
        handleRemotePass(seat);
      }
      // 操作成功后上锁，避免 handleRemotePlay/Pass 静默失败导致锁泄漏
      lastAiActionRef.current = actionKey;
    }, 400);

    return () => clearInterval(interval);
  }, [phase, effectiveMySeat, handleRemotePlay, handleRemotePass]);

  const myHand = hands[effectiveMySeat] || [];

  const handleCardClick = useCallback(
    (index: number) => {
      if (currentSeat !== effectiveMySeat) return;
      sound.playSelect();
      setSelectedIndices((prev) => {
        const next = new Set(prev);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        return next;
      });
    },
    [currentSeat, effectiveMySeat, sound],
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
      // 音效
      const classified = classifyHand(selected, levelRank);
      if (classified?.type === 'bomb' || classified?.type === 'rocket') {
        sound.playBomb();
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

  const handleHint = useCallback(() => {
    if (myHand.length > 0) setSelectedIndices(new Set([0]));
  }, [myHand]);

  if (initializing || phase === 'idle' || !connected) {
    return <RoomSkeleton />;
  }

  const handScaleStyle = { transform: 'scale(var(--hand-scale))' } as React.CSSProperties;
  const handScaleMobile: React.CSSProperties = {
    transform: 'scale(var(--hand-scale-mobile))',
  };

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex flex-col">
        <div className="mx-auto w-full max-w-7xl px-1 sm:px-2 pt-1 sm:pt-2">
          <Scoreboard />
          <div className="mt-1">
            <GameStatusBar
            status={phase === 'finished' ? 'finished' : 'playing'}
            levelRank={levelRank}
            turnNo={turnNo}
            roundCount={roundNumber}
            roomName="联网对局"
            hasTribute={!!tributeInfo}
            resistCount={tributeInfo?.resistSeats?.length || 0}
          />
          </div>
        </div>

        {/* ======= 牌桌 ======= */}
        <div className="mx-auto w-full max-w-7xl px-1 sm:px-2 py-0.5 sm:py-1 flex-1 flex flex-col">
          <div className="poker-table-bg poker-table-border flex-1 flex flex-col overflow-hidden relative">

            <DealAnimation
              play={dealAnimation}
              onComplete={() => setDealAnimation(false)}
            />

            {/* 上方：对家 (seat 1) */}
            <div className="flex flex-col items-center pt-1">
              <div className="overflow-x-auto max-w-full hidden sm:block" style={handScaleStyle}>
                <div className="flex gap-0 min-w-max justify-center px-1">
                  {hands[1]?.map((card, i) => (
                    <div key={i} className="shrink-0 rotate-180"
                      style={{ marginLeft: i > 0 ? 'var(--card-overlap)' : '0', zIndex: i }}>
                      <PlayingCard card={card} size="md" />
                    </div>
                  ))}
                </div>
              </div>
              <PlayerSeat name={playerNames[1]} cardCount={hands[1]?.length || 0}
                isOnline={true} isCurrentTurn={currentSeat === 1} isMe={false} />
            </div>

            {/* 中间：上家(0) | 出牌区 | 下家(2) */}
            <div className="flex items-center justify-between flex-1 px-0 gap-0">
              {/* 左：上家 */}
              <div className="hidden sm:flex items-center self-stretch shrink-0" style={{ marginLeft: 'var(--player-offset-left)' }}>
                <div className="flex gap-0 min-w-max my-auto" style={{ transform: 'rotate(90deg) scale(var(--hand-scale))', transformOrigin: 'center center' }}>
                  {hands[0]?.map((card, i) => (
                    <div key={i} className="shrink-0 -rotate-90"
                      style={{ marginLeft: i > 0 ? 'var(--card-overlap)' : '0', zIndex: i }}>
                      <PlayingCard card={card} size="md" />
                    </div>
                  ))}
                </div>
                <div className="flex flex-col items-center ml-0.5">
                  <PlayerSeat name={playerNames[0]} cardCount={hands[0]?.length || 0}
                    isOnline={true} isCurrentTurn={currentSeat === 0} isMe={false} />
                </div>
              </div>

              {/* 移动端上家(简化为仅座位) */}
              <div className="sm:hidden flex items-center self-stretch shrink-0">
                <PlayerSeat name={playerNames[0]} cardCount={hands[0]?.length || 0}
                  isOnline={true} isCurrentTurn={currentSeat === 0} isMe={false} />
              </div>

              {/* 中：牌桌出牌区 */}
              <div className="flex-1 flex items-center justify-center min-h-[160px] sm:min-h-[200px]">
                <TableArea recentTurns={recentTurns.slice(0, 2)} currentTurnSeat={currentSeat} />
              </div>

              {/* 移动端下家(简化为仅座位) */}
              <div className="sm:hidden flex items-center self-stretch shrink-0">
                <PlayerSeat name={playerNames[2]} cardCount={hands[2]?.length || 0}
                  isOnline={true} isCurrentTurn={currentSeat === 2} isMe={false} />
              </div>

              {/* 右：下家 */}
              <div className="hidden sm:flex items-center self-stretch shrink-0" style={{ marginRight: 'var(--player-offset-right)' }}>
                <div className="flex flex-col items-center mr-0.5">
                  <PlayerSeat name={playerNames[2]} cardCount={hands[2]?.length || 0}
                    isOnline={true} isCurrentTurn={currentSeat === 2} isMe={false} />
                </div>
                <div className="flex gap-0 min-w-max my-auto" style={{ transform: 'rotate(-90deg) scale(var(--hand-scale))', transformOrigin: 'center center' }}>
                  {hands[2]?.map((card, i) => (
                    <div key={i} className="shrink-0 rotate-90"
                      style={{ marginLeft: i > 0 ? 'var(--card-overlap)' : '0', zIndex: (hands[2]?.length || 0) - i }}>
                      <PlayingCard card={card} size="md" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 下方：人类 (seat 3) */}
            <div className="flex flex-col items-center pb-1">
              <PlayerSeat name={playerNames[3]} cardCount={myHand.length}
                isOnline={true} isCurrentTurn={currentSeat === 3} isMe={true} />
              <div className="w-full max-w-4xl px-0 hidden sm:block" style={{ transform: 'scale(var(--my-hand-scale))', transformOrigin: 'bottom center' }}>
                <HandArea cards={myHand}
                  selectedCardIds={selectedIndices}
                  playingIndices={playingIndices}
                  disabled={currentSeat !== effectiveMySeat}
                  onCardClick={handleCardClick} />
              </div>
              {/* 移动端手牌 */}
              <div className="w-full max-w-4xl px-0 sm:hidden">
                <HandArea cards={myHand}
                  selectedCardIds={selectedIndices}
                  playingIndices={playingIndices}
                  disabled={currentSeat !== effectiveMySeat}
                  onCardClick={handleCardClick} />
              </div>
            </div>

          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mx-auto w-full max-w-7xl px-2">
            <p className="text-center text-xs text-red-400 animate-pulse">{error}</p>
          </div>
        )}

        {/* 操作栏 — 深色玻璃态，移动端安全区 */}
        <div className="sticky bottom-0 mx-auto w-full max-w-7xl glass-dark border-t border-white/10 pb-[env(safe-area-inset-bottom,0px)]">
          <ActionBar
            canPlay={currentSeat === effectiveMySeat}
            selectedCount={selectedIndices.size}
            onPlay={handlePlay}
            onPass={handlePass}
            onHint={handleHint}
          />
        </div>
      </main>
    </div>
  );
};
