-- Fix security issues

-- 1. Fix the teams table policy - restrict to only matching invite codes or team members
DROP POLICY IF EXISTS "Anyone can lookup team by invite code" ON public.teams;

-- New policy: Only authenticated users can lookup teams, and only if they provide the invite code
-- or are already a member of that team
CREATE POLICY "Team lookup for members and invite codes"
ON public.teams
FOR SELECT
TO authenticated
USING (
  -- User is a member of this team
  EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_members.team_id = teams.id 
    AND team_members.user_id = auth.uid()
  )
);

-- For invite code lookups, we use a function instead
-- Create a function to lookup team by invite code
CREATE OR REPLACE FUNCTION public.lookup_team_by_invite_code(p_invite_code text)
RETURNS TABLE(id uuid, name text) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.name
  FROM public.teams t
  WHERE t.invite_code = p_invite_code
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 2. Add DELETE policy for team_members - allow users to leave teams
CREATE POLICY "Users can leave teams"
ON public.team_members
FOR DELETE
USING (user_id = auth.uid());