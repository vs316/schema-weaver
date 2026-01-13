-- Fix: Allow team members to view each other's profiles
-- First, create a function to get all team IDs a user is a member of
CREATE OR REPLACE FUNCTION public.get_user_team_ids(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id FROM public.team_members WHERE user_id = p_user_id
$$;

-- Create a function to check if two users share a team
CREATE OR REPLACE FUNCTION public.users_share_team(user1_id uuid, user2_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.team_members tm1
    JOIN public.team_members tm2 ON tm1.team_id = tm2.team_id
    WHERE tm1.user_id = user1_id AND tm2.user_id = user2_id
  )
$$;

-- Drop existing profiles SELECT policy
DROP POLICY IF EXISTS "Users can view profiles in their team" ON public.profiles;

-- Create new policy that allows viewing profiles of team members across all shared teams
CREATE POLICY "Users can view profiles of shared team members"
ON public.profiles
FOR SELECT
USING (
  id = auth.uid() OR 
  public.users_share_team(auth.uid(), id)
);

-- Create admin roles table for application-level admin access
CREATE TYPE public.admin_role AS ENUM ('super_admin', 'admin');

CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role admin_role NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check admin status
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = p_user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = p_user_id AND role = 'super_admin'
  )
$$;

-- RLS policies for admin_users table
CREATE POLICY "Admins can view admin_users"
ON public.admin_users
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Super admins can manage admin_users"
ON public.admin_users
FOR ALL
USING (public.is_super_admin(auth.uid()));

-- Insert initial super admin (vachan.shetty@biotale.io)
INSERT INTO public.admin_users (user_id, email, role)
SELECT id, email, 'super_admin'
FROM auth.users
WHERE email = 'vachan.shetty@biotale.io'
ON CONFLICT (user_id) DO NOTHING;

-- Create admin-only SELECT policies for full data access
-- Admins can view all teams
DROP POLICY IF EXISTS "Team members can view their teams" ON public.teams;
CREATE POLICY "Team members and admins can view teams"
ON public.teams
FOR SELECT
USING (public.is_team_member(id) OR public.is_admin(auth.uid()));

-- Admins can view all diagrams
DROP POLICY IF EXISTS "Team members can view diagrams" ON public.erd_diagrams;
CREATE POLICY "Team members and admins can view diagrams"
ON public.erd_diagrams
FOR SELECT
USING (team_id = get_user_team_id(auth.uid()) OR public.is_admin(auth.uid()));

-- Admins can view all profiles
DROP POLICY IF EXISTS "Users can view profiles of shared team members" ON public.profiles;
CREATE POLICY "Users can view profiles"
ON public.profiles
FOR SELECT
USING (
  id = auth.uid() OR 
  public.users_share_team(auth.uid(), id) OR
  public.is_admin(auth.uid())
);

-- Admins can view all team_members
DROP POLICY IF EXISTS "Team members can view their team members" ON public.team_members;
CREATE POLICY "Team members and admins can view team members"
ON public.team_members
FOR SELECT
USING (team_id = get_user_team_id(auth.uid()) OR public.is_admin(auth.uid()));

-- Allow team owners to delete their teams
CREATE POLICY "Team owners can delete their teams"
ON public.teams
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_id = teams.id 
    AND user_id = auth.uid() 
    AND role = 'owner'
  )
);

-- Add trigger for updated_at on admin_users
CREATE TRIGGER update_admin_users_updated_at
BEFORE UPDATE ON public.admin_users
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();