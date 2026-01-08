-- Add table descriptions and comments to erd_diagrams
-- Add description column to support table-level descriptions stored in the tables JSON

-- Create team_members table for roles (separate from profiles for security)
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);

-- Enable RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for team_members
CREATE POLICY "Team members can view their team members"
ON public.team_members
FOR SELECT
USING (team_id = get_user_team_id(auth.uid()));

CREATE POLICY "Team owners/admins can manage members"
ON public.team_members
FOR ALL
USING (
  team_id = get_user_team_id(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_id = team_members.team_id 
    AND user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
);

-- Add is_locked column to erd_diagrams for lock/unlock functionality
ALTER TABLE public.erd_diagrams 
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES auth.users(id);

-- Function to migrate existing team members from profiles
CREATE OR REPLACE FUNCTION public.migrate_team_members()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert existing profile team associations as members
  INSERT INTO public.team_members (team_id, user_id, role)
  SELECT p.team_id, p.id, 'owner'
  FROM public.profiles p
  WHERE p.team_id IS NOT NULL
  ON CONFLICT (team_id, user_id) DO NOTHING;
END;
$$;

-- Run migration
SELECT public.migrate_team_members();

-- Function to get user role in a team
CREATE OR REPLACE FUNCTION public.get_user_role(p_team_id UUID, p_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.team_members WHERE team_id = p_team_id AND user_id = p_user_id
$$;

-- Update join_team_by_invite to also create team_members entry
CREATE OR REPLACE FUNCTION public.join_team_by_invite(p_invite_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id UUID;
  v_team_name TEXT;
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Find team by invite code
  SELECT id, name INTO v_team_id, v_team_name
  FROM public.teams
  WHERE invite_code = p_invite_code;

  IF v_team_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid invite code');
  END IF;

  -- Update user's profile to join the team
  UPDATE public.profiles
  SET team_id = v_team_id, updated_at = now()
  WHERE id = v_user_id;

  -- Add to team_members as member
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (v_team_id, v_user_id, 'member')
  ON CONFLICT (team_id, user_id) DO NOTHING;

  RETURN json_build_object(
    'success', true, 
    'team_id', v_team_id::text, 
    'team_name', v_team_name
  );
END;
$$;

-- Function to update member role (only owner/admin can do this)
CREATE OR REPLACE FUNCTION public.update_member_role(p_member_user_id UUID, p_new_role TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id UUID;
  v_caller_role TEXT;
BEGIN
  v_team_id := get_user_team_id(auth.uid());
  
  IF v_team_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not in a team');
  END IF;

  -- Get caller's role
  SELECT role INTO v_caller_role
  FROM public.team_members
  WHERE team_id = v_team_id AND user_id = auth.uid();

  IF v_caller_role NOT IN ('owner', 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  -- Cannot demote owner
  IF EXISTS (SELECT 1 FROM public.team_members WHERE team_id = v_team_id AND user_id = p_member_user_id AND role = 'owner') THEN
    RETURN json_build_object('success', false, 'error', 'Cannot change owner role');
  END IF;

  -- Update role
  UPDATE public.team_members
  SET role = p_new_role, updated_at = now()
  WHERE team_id = v_team_id AND user_id = p_member_user_id;

  RETURN json_build_object('success', true);
END;
$$;

-- Add trigger for updated_at on team_members
CREATE TRIGGER update_team_members_updated_at
BEFORE UPDATE ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();