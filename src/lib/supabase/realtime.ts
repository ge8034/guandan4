import type { Card } from '@/lib/game/types';

export type GameEvent =
  | { type: 'play'; seatNo: number; cards: Card[]; turnNo: number }
  | { type: 'pass'; seatNo: number; turnNo: number }
  | { type: 'game_start'; gameId: string };
