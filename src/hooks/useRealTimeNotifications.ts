import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../integrations/supabase/safeClient';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { DiagramNotification } from '../components/RealTimeNotification';

const generateId = () => Math.random().toString(36).substr(2, 9);

export function useRealTimeNotifications(
  teamId: string | null,
  currentUserId: string | null,
  currentDiagramId: string | null
) {
  const [notifications, setNotifications] = useState<DiagramNotification[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const profileCacheRef = useRef<Map<string, string>>(new Map());

  // Get user display name from profile
  const getUserName = useCallback(async (userId: string): Promise<string> => {
    if (profileCacheRef.current.has(userId)) {
      return profileCacheRef.current.get(userId)!;
    }

    const { data } = await supabase
      .from('profiles')
      .select('display_name, email')
      .eq('id', userId)
      .single();

    const name = data?.display_name || data?.email?.split('@')[0] || 'Someone';
    profileCacheRef.current.set(userId, name);
    return name;
  }, []);

  const addNotification = useCallback(
    async (
      type: DiagramNotification['type'],
      diagramName: string,
      userId: string
    ) => {
      // Don't notify for own actions
      if (userId === currentUserId) return;

      const userName = await getUserName(userId);

      const notification: DiagramNotification = {
        id: generateId(),
        type,
        diagramName,
        userName,
        timestamp: new Date(),
        message:
          type === 'create'
            ? `${userName} created "${diagramName}"`
            : type === 'delete'
            ? `${userName} deleted "${diagramName}"`
            : `${userName} updated "${diagramName}"`,
      };

      setNotifications((prev) => [notification, ...prev].slice(0, 20));
    },
    [currentUserId, getUserName]
  );

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setNotifications([]);
  }, []);

  useEffect(() => {
    if (!teamId) return;

    channelRef.current?.unsubscribe();

    channelRef.current = supabase
      .channel(`diagram-notifications-${teamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'erd_diagrams',
          filter: `team_id=eq.${teamId}`,
        },
        async (payload) => {
          const diagram = payload.new as any;
          const oldDiagram = payload.old as any;

          if (payload.eventType === 'INSERT') {
            await addNotification('create', diagram.name, diagram.created_by);
          } else if (payload.eventType === 'DELETE') {
            await addNotification('delete', oldDiagram?.name || 'a diagram', oldDiagram?.updated_by || '');
          } else if (payload.eventType === 'UPDATE') {
            // Only notify if it's not the currently active diagram
            if (diagram.id !== currentDiagramId) {
              await addNotification('update', diagram.name, diagram.updated_by);
            }
          }
        }
      )
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [teamId, currentDiagramId, addNotification]);

  return {
    notifications,
    dismiss,
    dismissAll,
  };
}