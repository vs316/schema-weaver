import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../integrations/supabase/safeClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface PresenceUser {
  id: string;
  name: string;
  email?: string;
  color: string;
  lastSeen: string;
  cursor?: { x: number; y: number };
}

// Generate consistent color from user ID
function generateUserColor(userId: string): string {
  const colors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899',
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function usePresence(diagramId: string | null, userId?: string, userName?: string) {
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const usersMapRef = useRef<Map<string, PresenceUser>>(new Map());
  // Cursor updates are throttled via interval
  const pendingCursorUpdate = useRef<{ x: number; y: number } | null>(null);
  const cursorIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Join presence channel
  useEffect(() => {
    if (!diagramId || !userId) return;

    const myColor = generateUserColor(userId);
    
    const channel = supabase.channel(`presence:${diagramId}`, {
      config: {
        presence: { key: userId },
        broadcast: { self: false }, // Don't receive own broadcasts
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const activeUsers: PresenceUser[] = [];
        
        Object.values(state).forEach((presences: any[]) => {
          presences.forEach((presence) => {
            if (presence.id !== userId) {
              // Preserve cursor from our local tracking
              const existing = usersMapRef.current.get(presence.id);
              activeUsers.push({
                ...presence,
                cursor: existing?.cursor || presence.cursor,
              });
            }
          });
        });
        
        usersMapRef.current.clear();
        activeUsers.forEach(u => usersMapRef.current.set(u.id, u));
        setUsers([...activeUsers]);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('[Presence] User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('[Presence] User left:', leftPresences);
        for (const p of leftPresences as any[]) {
          if (p.id) {
            usersMapRef.current.delete(p.id);
          }
        }
        setUsers(Array.from(usersMapRef.current.values()));
      })
      // Listen for cursor broadcasts from other users
      .on('broadcast', { event: 'cursor' }, ({ payload }) => {
        if (!payload || payload.userId === userId) return;
        
        const existing = usersMapRef.current.get(payload.userId);
        const updatedUser: PresenceUser = existing 
          ? { ...existing, cursor: payload.cursor, lastSeen: new Date().toISOString() }
          : {
              id: payload.userId,
              name: payload.userName || 'Anonymous',
              color: generateUserColor(payload.userId),
              lastSeen: new Date().toISOString(),
              cursor: payload.cursor,
            };
        
        usersMapRef.current.set(payload.userId, updatedUser);
        setUsers(Array.from(usersMapRef.current.values()));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          
          // Track our presence
          await channel.track({
            id: userId,
            name: userName || 'Anonymous',
            color: myColor,
            lastSeen: new Date().toISOString(),
          });
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsConnected(false);
        }
      });

    channelRef.current = channel;

    // Set up interval to send pending cursor updates (throttled to ~15fps)
    cursorIntervalRef.current = setInterval(() => {
      if (pendingCursorUpdate.current && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'cursor',
          payload: {
            userId,
            userName: userName || 'Anonymous',
            cursor: pendingCursorUpdate.current,
          },
        });
        pendingCursorUpdate.current = null;
      }
    }, 66); // ~15fps

    return () => {
      if (cursorIntervalRef.current) {
        clearInterval(cursorIntervalRef.current);
      }
      channel.unsubscribe();
      channelRef.current = null;
      setIsConnected(false);
      usersMapRef.current.clear();
    };
  }, [diagramId, userId, userName]);

  // Update cursor position (debounced via interval)
  const updateCursor = useCallback((x: number, y: number) => {
    pendingCursorUpdate.current = { x, y };
  }, []);

  return {
    users,
    isConnected,
    updateCursor,
  };
}
