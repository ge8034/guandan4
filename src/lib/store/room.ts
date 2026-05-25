import { create } from 'zustand';
import type { RoomWithMembers } from '@/lib/supabase/rooms';
import { fetchRooms, createRoom, joinRoom, leaveRoom, deleteRoom } from '@/lib/supabase/rooms';
import { getOrCreateUser, getUserIdSync } from '@/lib/supabase/auth';

interface RoomStore {
  rooms: RoomWithMembers[];
  currentRoomId: string | null;
  currentRoomType: 'practice' | 'battle' | null;
  mySeat: number | null;
  userId: string | null;
  loading: boolean;
  error: string | null;

  init: () => Promise<void>;
  loadRooms: () => Promise<void>;
  createAndJoin: (name: string, type: 'practice' | 'battle') => Promise<string>;
  join: (roomId: string) => Promise<void>;
  leave: () => Promise<void>;
  remove: (roomId: string) => Promise<void>;
}

export const useRoomStore = create<RoomStore>((set, get) => ({
  rooms: [],
  currentRoomId: null,
  currentRoomType: null,
  mySeat: null,
  userId: null,
  loading: false,
  error: null,

  init: async () => {
    set({ loading: true });
    try {
      const userId = await getOrCreateUser();
      set({ userId });
      await get().loadRooms();
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  loadRooms: async () => {
    try {
      const rooms = await fetchRooms();
      set({ rooms });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  createAndJoin: async (name, type) => {
    const room = await createRoom(name, type);
    const seat = await joinRoom(room.id);
    set({ currentRoomId: room.id, currentRoomType: type, mySeat: seat });
    await get().loadRooms();
    return room.id;
  },

  join: async (roomId) => {
    const seat = await joinRoom(roomId);
    set({ currentRoomId: roomId, mySeat: seat });
    await get().loadRooms();
    const currentRoom = get().rooms.find((r) => r.room.id === roomId);
    if (currentRoom) {
      set({ currentRoomType: currentRoom.room.type });
    }
  },

  leave: async () => {
    const { currentRoomId } = get();
    if (currentRoomId) {
      await leaveRoom(currentRoomId);
      set({ currentRoomId: null, currentRoomType: null, mySeat: null });
      await get().loadRooms();
    }
  },

  remove: async (roomId: string) => {
    try {
      await deleteRoom(roomId);
      await get().loadRooms();
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },
}));
