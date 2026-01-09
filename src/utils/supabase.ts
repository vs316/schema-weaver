// Supabase integration for Team ERD Workspace
// Re-export from safeClient to ensure consistent configuration
export { supabase } from '../integrations/supabase/safeClient';
export { getResolvedBackendConfig } from '../integrations/supabase/safeClient';

// Get URLs for edge functions etc.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ekafxpolsdhlktmsgexd.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVrYWZ4cG9sc2RobGt0bXNnZXhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMDc1ODUsImV4cCI6MjA4MjU4MzU4NX0.pWorY9v_1CG3R8DsxuYPU5nUEh9ceOO-cMhd3V4U_WA';
