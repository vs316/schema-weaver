-- Fix infinite recursion in team_members policies

-- Drop the problematic policy
DROP POLICY IF EXISTS "Team owners/admins can manage members" ON public.team_members;

-- Create a SECURITY DEFINER function to check if user is owner/admin of a team
-- This avoids recursion by bypassing RLS
CREATE OR REPLACE FUNCTION public.is_team_owner_or_admin(p_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE team_id = p_team_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
$$;

-- Recreate the policy using the function
CREATE POLICY "Team owners and admins can manage members"
ON public.team_members
FOR ALL
USING (
  public.is_team_owner_or_admin(team_id)
);

-- Also update the teams SELECT policy to use a simpler approach
DROP POLICY IF EXISTS "Team lookup for members and invite codes" ON public.teams;

-- Create a SECURITY DEFINER function to check team membership
CREATE OR REPLACE FUNCTION public.is_team_member(p_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE team_id = p_team_id
      AND user_id = auth.uid()
  )
$$;

-- Recreate teams SELECT policy using the function
CREATE POLICY "Team members can view their teams"
ON public.teams
FOR SELECT
TO authenticated
USING (public.is_team_member(id));