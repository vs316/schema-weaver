-- Drop the old restrictive SELECT policy
DROP POLICY IF EXISTS "Team members and admins can view team members" ON public.team_members;

-- Create a new policy that allows users to see their OWN memberships across all teams
-- plus see other members within teams they belong to, plus admin access
CREATE POLICY "Users can view own memberships and team members"
  ON public.team_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR team_id IN (SELECT tm.team_id FROM public.team_members tm WHERE tm.user_id = auth.uid())
    OR is_admin(auth.uid())
  );