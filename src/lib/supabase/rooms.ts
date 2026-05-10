import { supabase } from './client';
import { getUserIdSync } from './auth';

export interface Room {
  id: string;
  name: string;
  type: 'practice' | 'battle';
  status: 'waiting' | 'playing' | 'finished';
  level_rank: number;
  max_players: number;
  created_by: string;
  created_at: string;
}

export interface RoomMember {
  id?: string;
  room_id: string;
  user_id: string;
  seat_no: number;
  is_ready?: boolean;
}

export interface RoomWithMembers {
  room: Room;
  members: RoomMember[];
  playerCount: number;
}

export async function fetchRooms(): Promise<RoomWithMembers[]> {
  const { data: rooms, error } = await supabase
    .from('rooms')
    .select('*, room_members(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (rooms || []).map((r: any) => ({
    room: {
      id: r.id,
      name: r.name,
      type: r.type,
      status: r.status,
      level_rank: r.level_rank,
      max_players: r.max_players,
      created_by: r.created_by,
      created_at: r.created_at,
    },
    members: (r.room_members || []).map((m: any) => ({
      id: m.id,
      room_id: m.room_id,
      user_id: m.user_id,
      seat_no: m.seat_no,
      is_ready: m.is_ready,
    })),
    playerCount: (r.room_members || []).length,
  }));
}

export async function createRoom(
  name: string,
  type: 'practice' | 'battle',
): Promise<Room> {
  const userId = getUserIdSync();
  if (!userId) throw new Error('未登录');
  const { data, error } = await supabase
    .from('rooms')
    .insert({ name, type, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data as Room;
}

export async function joinRoom(roomId: string): Promise<number> {
  const userId = getUserIdSync();
  if (!userId) throw new Error('未登录');

  // 检查是否已在房间中
  const { data: existing, error: checkErr } = await supabase
    .from('room_members')
    .select('seat_no, user_id')
    .eq('room_id', roomId);
  if (checkErr) throw checkErr;

  const myEntry = (existing || []).find((m: any) => m.user_id === userId);
  if (myEntry) return myEntry.seat_no; // 已在房间，直接返回座位

  // 找空座位
  const takenSeats = new Set((existing || []).map((m: any) => m.seat_no));
  let seatNo = -1;
  for (let s = 0; s < 4; s++) {
    if (!takenSeats.has(s)) { seatNo = s; break; }
  }
  if (seatNo === -1) throw new Error('房间已满');

  const { error } = await supabase
    .from('room_members')
    .insert({ room_id: roomId, user_id: userId, seat_no: seatNo });
  if (error) throw error;
  return seatNo;
}

export async function leaveRoom(roomId: string): Promise<void> {
  const userId = getUserIdSync();
  if (!userId) return;
  await supabase
    .from('room_members')
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', userId);
}

export async function deleteRoom(roomId: string): Promise<void> {
  const userId = getUserIdSync();
  if (!userId) throw new Error('请先登录后再删除房间');
  await supabase.from('room_members').delete().eq('room_id', roomId);
  const { error } = await supabase.from('rooms').delete().eq('id', roomId).eq('owner_id', userId);
  if (error) throw error;
}
