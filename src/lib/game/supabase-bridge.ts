import { supabase } from '@/lib/supabase/client';
import type { Card, TurnRecord } from './types';

/** 异步持久化出牌记录到 turns 表 */
export function persistTurn(
  roomId: string,
  gameId: string,
  turnNo: number,
  seatNo: number,
  actionType: 'play' | 'pass',
  cards?: Card[],
): void {
  supabase
    .from('turns')
    .insert({
      room_id: roomId,
      game_id: gameId,
      turn_no: turnNo,
      seat_no: seatNo,
      action_type: actionType,
      payload: cards ? { cards } : null,
    })
    .then(({ error }) => {
      if (error) console.error('持久化出牌失败:', error);
    });
}

/** 从 turns 表回放历史记录（断线重连用） */
export async function replayTurns(
  roomId: string,
  gameId: string,
  fromTurnNo: number = 0,
): Promise<TurnRecord[]> {
  const { data, error } = await supabase
    .from('turns')
    .select('*')
    .eq('room_id', roomId)
    .eq('game_id', gameId)
    .gte('turn_no', fromTurnNo)
    .order('turn_no', { ascending: true });

  if (error) throw error;

  return (data || []).map((t: Record<string, unknown>) => ({
    turnNo: t.turn_no as number,
    seatNo: t.seat_no as number,
    type: t.action_type as 'play' | 'pass',
    cards: (t.payload as { cards?: Card[] } | null)?.cards,
  }));
}
