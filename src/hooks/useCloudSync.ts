import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../integrations/supabase/safeClient';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Json } from '../integrations/supabase/types';
import type { DiagramType } from '../types/uml';

export interface ERDDiagram {
  id: string;
  name: string;
  diagram_type: DiagramType;
  // ERD data
  tables: Json;
  relations: Json;
  // UML Class Diagram data
  uml_classes: Json;
  uml_relations: Json;
  // Flowchart data
  flowchart_nodes: Json;
  flowchart_connections: Json;
  // Sequence Diagram data
  sequence_participants: Json;
  sequence_messages: Json;
  // Common fields
  viewport: Json;
  is_dark_mode: boolean;
  is_locked?: boolean;
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
  const [error, setError] = useState<string | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);

  /* ------------------------------------------------------------------ */
  /* Helpers                                                            */
  /* ------------------------------------------------------------------ */

  const fetchDiagrams = useCallback(async (team_id: string) => {
    const { data, error } = await supabase
      .from('erd_diagrams')
      .select('*')
      .eq('team_id', team_id)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch diagrams:', error);
      setError('Failed to load diagrams.');
      return;
    }

    // Cast diagram_type to DiagramType since DB stores as text
    const typedData = (data || []).map(d => ({
      ...d,
      diagram_type: (d.diagram_type || 'erd') as DiagramType,
    }));
    setDiagrams(typedData);
  }, []);

  const setupRealtime = useCallback(
    (team_id: string) => {
      channelRef.current?.unsubscribe();

      channelRef.current = supabase
        .channel(`erd-diagrams-${team_id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'erd_diagrams',
            filter: `team_id=eq.${team_id}`,
          },
          (payload) => {
            // Fetch updated list
            fetchDiagrams(team_id);
            
            // If the current diagram was updated, update its state
            if (payload.eventType === 'UPDATE' && payload.new) {
              const updatedDiagram = payload.new as ERDDiagram;
              setCurrentDiagram((prev) => {
                if (prev && prev.id === updatedDiagram.id) {
                  // Only update if data actually changed (avoid overwriting local edits)
                  return updatedDiagram;
                }
                return prev;
              });
            }
          }
        )
        .subscribe();
    },
    [fetchDiagrams]
  );

  /* ------------------------------------------------------------------ */
  /* Init (NO self-calls)                                                */
  /* ------------------------------------------------------------------ */

  const init = useCallback(async () => {
    setLoading(true);
    setError(null);

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      setError('Authentication failed. Please sign in again.');
      setLoading(false);
      return;
    }

    const user = session.user;

    // 1️⃣ Fetch profile
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Profile fetch error:', profileError);
      setError('Failed to load user profile.');
      setLoading(false);
      return;
    }

    // 2️⃣ Create profile if missing
    if (!profile) {
      const { error: insertError } = await supabase.from('profiles').insert({
        id: user.id,
        email: user.email,
        team_id: null,
      });

      if (insertError) {
        console.error('Profile creation failed:', insertError);
        setError('Failed to initialize your account.');
        setLoading(false);
        return;
      }

      // Re-fetch profile ONCE (no recursion)
      const res = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      profile = res.data;
      profileError = res.error;

      if (profileError || !profile) {
        setError('Failed to initialize profile.');
        setLoading(false);
        return;
      }
    }

    setProfileExists(true);
    setTeamId(profile.team_id);

    // 3️⃣ No team yet → onboarding state
    if (!profile.team_id) {
      setLoading(false);
      return;
    }

    // 4️⃣ Load data + realtime
    await fetchDiagrams(profile.team_id);
    setupRealtime(profile.team_id);

    setLoading(false);
  }, [fetchDiagrams, setupRealtime]);

  /* ------------------------------------------------------------------ */
  /* CRUD                                                               */
  /* ------------------------------------------------------------------ */

  const createDiagram = async (name: string, diagramType: DiagramType = 'erd'): Promise<ERDDiagram | null> => {
    if (!teamId) return null;

    setSyncing(true);

    const { data, error } = await supabase
      .from('erd_diagrams')
      .insert({
        name,
        diagram_type: diagramType,
        tables: [],
        relations: [],
        uml_classes: [],
        uml_relations: [],
        flowchart_nodes: [],
        flowchart_connections: [],
        sequence_participants: [],
        sequence_messages: [],
        // Avoid null/undefined viewport values which can cause NaN transforms in the canvas
        viewport: { x: 0, y: 0, zoom: 1 },
        // Default to dark; the UI will overwrite this to match the global ThemeProvider setting.
        is_dark_mode: true,
        is_locked: false,
        team_id: teamId,
      })
      .select()
      .single();

    setSyncing(false);

    if (error || !data) return null;

    // Cast diagram_type to DiagramType
    const typedData: ERDDiagram = {
      ...data,
      diagram_type: (data.diagram_type || 'erd') as DiagramType,
    };

    setDiagrams((prev) => [typedData, ...prev]);
    setCurrentDiagram(typedData);

    return typedData;
  };

  const saveDiagram = async (
    id: string,
    updates: {
      diagram_type?: DiagramType;
      tables?: Json;
      relations?: Json;
      uml_classes?: Json;
      uml_relations?: Json;
      flowchart_nodes?: Json;
      flowchart_connections?: Json;
      sequence_participants?: Json;
      sequence_messages?: Json;
      viewport?: Json;
      is_dark_mode?: boolean;
      is_locked?: boolean;
    }
  ) => {
    setSyncing(true);

    await supabase
      .from('erd_diagrams')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    setSyncing(false);
  };

  const deleteDiagram = async (id: string) => {
    await supabase.from('erd_diagrams').delete().eq('id', id);
    setDiagrams((prev) => prev.filter((d) => d.id !== id));

    if (currentDiagram?.id === id) {
      setCurrentDiagram(null);
    }
  };

  const loadDiagram = (id: string): ERDDiagram | null => {
    const diagram = diagrams.find((d) => d.id === id) || null;
    setCurrentDiagram(diagram);
    return diagram;
  };

  /* ------------------------------------------------------------------ */
  /* Effects                                                            */
  /* ------------------------------------------------------------------ */

  useEffect(() => {
    init();
    return () => {
      channelRef.current?.unsubscribe();
    };
  }, [init, userId]);

  return {
    diagrams,
    currentDiagram,
    loading,
    syncing,
    teamId,
    profileExists,
    error,
    fetchDiagrams,
    createDiagram,
    saveDiagram,
    deleteDiagram,
    loadDiagram,
    setCurrentDiagram,
  };
}
