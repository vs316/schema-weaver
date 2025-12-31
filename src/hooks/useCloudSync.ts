import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../integrations/supabase/client';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { Json } from '../integrations/supabase/types';

export interface ERDDiagram {
  id: string;
  name: string;
  tables: Json;
  relations: Json;
  viewport: Json;
  is_dark_mode: boolean;
  team_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useCloudSync(userId?: string) {
  const [diagrams, setDiagrams] = useState<ERDDiagram[]>([]);
  const [currentDiagram, setCurrentDiagram] = useState<ERDDiagram | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [profileExists, setProfileExists] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Fetch user's team/profile (profile is created by Supabase auth trigger)
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const setupProfile = async () => {
      // Check if profile exists (created by auth trigger)
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('team_id')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching profile:', error);
        setLoading(false);
        return;
      }

      if (profile?.team_id) {
        setTeamId(profile.team_id);
        setProfileExists(true);
      } else {
        // Profile should be created by auth trigger, but wait a bit and retry
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data: retryProfile } = await supabase
          .from('profiles')
          .select('team_id')
          .eq('id', userId)
          .maybeSingle();
        
        if (retryProfile?.team_id) {
          setTeamId(retryProfile.team_id);
          setProfileExists(true);
        }
      }
      setLoading(false);
    };

    setupProfile();
  }, [userId]);

  // Fetch diagrams
  const fetchDiagrams = useCallback(async () => {
    if (!userId || !teamId) return;
    
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
  }, [userId, teamId]);

  useEffect(() => {
    if (teamId && profileExists) {
      fetchDiagrams();
    }
  }, [teamId, profileExists, fetchDiagrams]);

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
    if (!userId || !teamId) return null;

    setSyncing(true);
    const { data, error } = await supabase
      .from('erd_diagrams')
      .insert({
        name,
        team_id: teamId,
        created_by: userId,
        updated_by: userId,
        tables: [] as Json,
        relations: [] as Json,
        viewport: { x: 0, y: 0, zoom: 1 } as Json,
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
  }, [userId, teamId]);

  // Save diagram
  const saveDiagram = useCallback(async (
    diagramId: string,
    updates: {
      name?: string;
      tables?: Json;
      relations?: Json;
      viewport?: Json;
      is_dark_mode?: boolean;
    }
  ) => {
    if (!userId) return false;

    setSyncing(true);
    const { error } = await supabase
      .from('erd_diagrams')
      .update({
        ...updates,
        updated_by: userId,
      })
      .eq('id', diagramId);

    setSyncing(false);

    if (error) {
      console.error('Error saving diagram:', error);
      return false;
    }

    return true;
  }, [userId]);

  // Delete diagram
  const deleteDiagram = useCallback(async (diagramId: string) => {
    if (!userId) return false;

    const { error } = await supabase
      .from('erd_diagrams')
      .delete()
      .eq('id', diagramId);

    if (error) {
      console.error('Error deleting diagram:', error);
      return false;
    }

    return true;
  }, [userId]);

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
    profileExists,
    fetchDiagrams,
    createDiagram,
    saveDiagram,
    deleteDiagram,
    loadDiagram,
    setCurrentDiagram,
  };
}
