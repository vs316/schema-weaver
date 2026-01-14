-- Add RBAC roles (dev, reader) to team_members table
-- Update the role CHECK constraint to include new roles

-- First, drop the existing check constraint on role
ALTER TABLE public.team_members DROP CONSTRAINT IF EXISTS team_members_role_check;

-- Add new check constraint with additional roles
ALTER TABLE public.team_members 
ADD CONSTRAINT team_members_role_check 
CHECK (role IN ('owner', 'admin', 'member', 'dev', 'reader'));

-- Create function to check if user can edit diagrams
CREATE OR REPLACE FUNCTION public.can_edit_diagrams(p_team_id uuid, p_user_id uuid)
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
      AND user_id = p_user_id
      AND role IN ('owner', 'admin', 'member', 'dev')
  )
$$;

-- Create function to check if user can manage diagrams (rename/delete)
CREATE OR REPLACE FUNCTION public.can_manage_diagrams(p_team_id uuid, p_user_id uuid)
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
      AND user_id = p_user_id
      AND role IN ('owner', 'admin', 'member')
  )
$$;

-- Create function to get user's role in a team
CREATE OR REPLACE FUNCTION public.get_user_role(p_team_id uuid, p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.team_members
  WHERE team_id = p_team_id
    AND user_id = p_user_id
  LIMIT 1
$$;