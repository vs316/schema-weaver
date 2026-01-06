// Supabase integration for Team ERD Workspace
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL!;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const PROJECT_NAME = 'Team ERD Workspace';

// Load latest shared ERD
export const loadTeamERD = async () => {
  const { data, error } = await supabase
    .from('projects')
    .select('current_state')
    .eq('name', PROJECT_NAME)
    .single();

  if (error || !data) return null;
  return data.current_state;
};

// Save changes with timestamp update
export const saveTeamERD = async (erdState: any) => {
  const { error } = await supabase
    .from('projects')
    .update({
      current_state: erdState,
      updated_at: new Date().toISOString(),
    })
    .eq('name', PROJECT_NAME);

  if (error) console.error('Save failed:', error);
};
