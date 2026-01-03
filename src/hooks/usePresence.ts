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
              activeUsers.push(presence);
            }
          });
        });
        
        setUsers(activeUsers);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left:', leftPresences);
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
    };
  }, [diagramId, userId, userName]);

  // Update cursor position (throttled)
  const updateCursor = useCallback((x: number, y: number) => {
    if (!channelRef.current || !userId) return;

    // Throttle cursor updates
    if (cursorUpdateTimeoutRef.current) {
      clearTimeout(cursorUpdateTimeoutRef.current);
    }

    cursorUpdateTimeoutRef.current = setTimeout(() => {
      channelRef.current?.track({
        id: userId,
        name: userName || 'Anonymous',
        color: generateUserColor(userId),
        lastSeen: new Date().toISOString(),
        cursor: { x, y },
      });
    }, 50);
  }, [userId, userName]);

  return {
    users,
    isConnected,
    updateCursor,
  };
}
