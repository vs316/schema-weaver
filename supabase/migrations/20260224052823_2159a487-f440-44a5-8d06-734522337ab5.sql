-- Fix the self-referencing RLS policy on team_members
DROP POLICY IF EXISTS "Users can view own memberships and team members" ON public.team_members;

-- Use get_user_team_ids (SECURITY DEFINER) to avoid recursion
CREATE POLICY "Users can view own memberships and team members"
  ON public.team_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR team_id IN (SELECT get_user_team_ids(auth.uid()))
    OR is_admin(auth.uid())
  );

-- Enable realtime for team_members so team list auto-updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_members;