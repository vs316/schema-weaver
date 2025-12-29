import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from './useAuth';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export interface ERDDiagram {
  id: string;
  name: string;
  tables: unknown[];
  relations: unknown[];
  viewport: { x: number; y: number; zoom: number };
  is_dark_mode: boolean;
  team_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useCloudSync() {
  const { user } = useAuth();
  const [diagrams, setDiagrams] = useState<ERDDiagram[]>([]);
  const [currentDiagram, setCurrentDiagram] = useState<ERDDiagram | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [teamId, setTeamId] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Fetch user's team
  useEffect(() => {
    if (!user) return;

    const fetchTeam = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('team_id')
        .eq('id', user.id)
        .maybeSingle();
      
      if (data?.team_id) {
        setTeamId(data.team_id);
      }
    };

    fetchTeam();
  }, [user]);

  // Fetch diagrams
  const fetchDiagrams = useCallback(async () => {
    if (!user || !teamId) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('erd_diagrams')
      .select('*')
      .eq('team_id', teamId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching diagrams:', error);
    } else {
      setDiagrams(data as ERDDiagram[] || []);
    }
    setLoading(false);
  }, [user, teamId]);

  useEffect(() => {
    if (teamId) {
      fetchDiagrams();
    }
  }, [teamId, fetchDiagrams]);

  // Set up realtime subscription
  useEffect(() => {
    if (!teamId) return;

    const channel = supabase
      .channel('erd-diagrams-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'erd_diagrams',
          filter: `team_id=eq.${teamId}`,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          if (payload.eventType === 'INSERT') {
            setDiagrams(prev => [payload.new as unknown as ERDDiagram, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setDiagrams(prev => 
              prev.map(d => d.id === (payload.new as { id?: string }).id ? payload.new as unknown as ERDDiagram : d)
            );
            // Update current diagram if it's the one being edited
            if (currentDiagram?.id === (payload.new as { id?: string }).id) {
              setCurrentDiagram(payload.new as unknown as ERDDiagram);
            }
          } else if (payload.eventType === 'DELETE') {
            setDiagrams(prev => prev.filter(d => d.id !== (payload.old as { id?: string }).id));
            if (currentDiagram?.id === (payload.old as { id?: string }).id) {
              setCurrentDiagram(null);
            }
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, currentDiagram?.id]);

  // Create new diagram
  const createDiagram = useCallback(async (name: string = 'Untitled Diagram') => {
    if (!user || !teamId) return null;

    setSyncing(true);
    const { data, error } = await supabase
      .from('erd_diagrams')
      .insert({
        name,
        team_id: teamId,
        created_by: user.id,
        updated_by: user.id,
        tables: [],
        relations: [],
        viewport: { x: 0, y: 0, zoom: 1 },
        is_dark_mode: true,
      })
      .select()
      .single();

    setSyncing(false);

    if (error) {
      console.error('Error creating diagram:', error);
      return null;
    }

    return data as ERDDiagram;
  }, [user, teamId]);

  // Save diagram
  const saveDiagram = useCallback(async (
    diagramId: string,
    updates: Partial<Pick<ERDDiagram, 'name' | 'tables' | 'relations' | 'viewport' | 'is_dark_mode'>>
  ) => {
    if (!user) return false;

    setSyncing(true);
    const { error } = await supabase
      .from('erd_diagrams')
      .update({
        name: updates.name,
        tables: updates.tables as unknown as Record<string, unknown>[],
        relations: updates.relations as unknown as Record<string, unknown>[],
        viewport: updates.viewport as unknown as Record<string, unknown>,
        is_dark_mode: updates.is_dark_mode,
        updated_by: user.id,
      })
      .eq('id', diagramId);

    setSyncing(false);

    if (error) {
      console.error('Error saving diagram:', error);
      return false;
    }

    return true;
  }, [user]);

  // Delete diagram
  const deleteDiagram = useCallback(async (diagramId: string) => {
    if (!user) return false;

    const { error } = await supabase
      .from('erd_diagrams')
      .delete()
      .eq('id', diagramId);

    if (error) {
      console.error('Error deleting diagram:', error);
      return false;
    }

    return true;
  }, [user]);

  // Load a specific diagram
  const loadDiagram = useCallback(async (diagramId: string) => {
    const { data, error } = await supabase
      .from('erd_diagrams')
      .select('*')
      .eq('id', diagramId)
      .maybeSingle();

    if (error) {
      console.error('Error loading diagram:', error);
      return null;
    }

    setCurrentDiagram(data as ERDDiagram);
    return data as ERDDiagram;
  }, []);

  return {
    diagrams,
    currentDiagram,
    loading,
    syncing,
    teamId,
    fetchDiagrams,
    createDiagram,
    saveDiagram,
    deleteDiagram,
    loadDiagram,
    setCurrentDiagram,
  };
}
