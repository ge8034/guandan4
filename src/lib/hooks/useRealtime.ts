'use client';

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { GameEvent } from '@/lib/supabase/realtime';

export function useRealtime(
  roomId: string | null,
  onEvent: (event: GameEvent) => void,
) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase.channel(`game:${roomId}`, {
      config: { broadcast: { self: false } },
    });
    channel
      .on('broadcast', { event: 'game_event' }, (payload) => {
        onEvent(payload.payload as GameEvent);
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channelRef.current = channel;
        }
      });

    return () => {
      supabase.removeChannel(channel).catch(() => {});
      channelRef.current = null;
    };
  }, [roomId]);

  const send = useCallback(
    async (event: GameEvent) => {
      if (!channelRef.current) return;
      await channelRef.current.send({
        type: 'broadcast',
        event: 'game_event',
        payload: event,
      });
    },
    [],
  );

  return { send };
}
