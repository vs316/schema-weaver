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

interface PresenceState {
  [key: string]: PresenceUser[];
}

// Generate consistent color from user ID
function generateUserColor(userId: string): string {
  const colors = [
    '#ef4444', // red
    '#f97316', // orange
    '#eab308', // yellow
    '#22c55e', // green
    '#14b8a6', // teal
    '#3b82f6', // blue
    '#8b5cf6', // violet
    '#ec4899', // pink
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
  const cursorUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usersRef = useRef<Map<string, PresenceUser>>(new Map());

  // Join presence channel
  useEffect(() => {
    if (!diagramId || !userId) return;

    const channel = supabase.channel(`presence:${diagramId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as PresenceState;
        const activeUsers: PresenceUser[] = [];
        
        Object.values(state).forEach((presences) => {
          presences.forEach((presence) => {
            // Don't add current user to the list
            if (presence.id !== userId) {
              // Preserve cursor position from our local tracking
              const existing = usersRef.current.get(presence.id);
              activeUsers.push({
                ...presence,
                cursor: existing?.cursor || presence.cursor,
              });
            }
          });
        });
        
        // Update the users map
        usersRef.current.clear();
        activeUsers.forEach(u => usersRef.current.set(u.id, u));
        
        setUsers(activeUsers);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left:', leftPresences);
        // Remove left users from our tracking
        for (const p of leftPresences) {
          const presence = p as unknown as PresenceUser;
          if (presence.id) {
            usersRef.current.delete(presence.id);
          }
        }
      })
      // Listen for cursor broadcasts (separate from presence for high-frequency updates)
      .on('broadcast', { event: 'cursor' }, ({ payload }) => {
        if (payload.userId === userId) return; // Ignore our own cursor
        
        // Update cursor position for this user
        const existing = usersRef.current.get(payload.userId);
        if (existing) {
          const updated = { ...existing, cursor: payload.cursor };
          usersRef.current.set(payload.userId, updated);
          setUsers(Array.from(usersRef.current.values()));
        } else {
          // User might not be in presence yet, create a temporary entry
          const newUser: PresenceUser = {
            id: payload.userId,
            name: payload.userName || 'Anonymous',
            color: generateUserColor(payload.userId),
            lastSeen: new Date().toISOString(),
            cursor: payload.cursor,
          };
          usersRef.current.set(payload.userId, newUser);
          setUsers(Array.from(usersRef.current.values()));
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          
          // Track presence
          await channel.track({
            id: userId,
            name: userName || 'Anonymous',
            color: generateUserColor(userId),
            lastSeen: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      setIsConnected(false);
      usersRef.current.clear();
    };
  }, [diagramId, userId, userName]);

  // Update cursor position using broadcast (throttled)
  const updateCursor = useCallback((x: number, y: number) => {
    if (!channelRef.current || !userId) return;

    // Throttle cursor updates to ~20fps
    if (cursorUpdateTimeoutRef.current) {
      clearTimeout(cursorUpdateTimeoutRef.current);
    }

    cursorUpdateTimeoutRef.current = setTimeout(() => {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'cursor',
        payload: {
          userId,
          userName: userName || 'Anonymous',
          cursor: { x, y },
        },
      });
    }, 50);
  }, [userId, userName]);

  return {
    users,
    isConnected,
    updateCursor,
  };
}
