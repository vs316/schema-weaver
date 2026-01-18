-- Rate limiting tables and functions for security

-- Create invite_attempts table for tracking join attempts
CREATE TABLE IF NOT EXISTS public.invite_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  ip_address TEXT,
  attempt_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  success BOOLEAN DEFAULT FALSE
);

-- Enable RLS
ALTER TABLE public.invite_attempts ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own attempts
CREATE POLICY "Users can insert own attempts"
ON public.invite_attempts FOR INSERT
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_invite_attempts_user_time 
ON public.invite_attempts(user_id, attempt_time);

-- Add invite_code_regenerated_at to teams if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'teams' 
    AND column_name = 'invite_code_regenerated_at'
  ) THEN
    ALTER TABLE public.teams ADD COLUMN invite_code_regenerated_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Update join_team_by_invite with rate limiting
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
  v_attempt_count INT;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Rate limit: max 5 attempts per hour
  SELECT COUNT(*) INTO v_attempt_count
  FROM public.invite_attempts
  WHERE user_id = v_user_id
    AND attempt_time > NOW() - INTERVAL '1 hour';
    
  IF v_attempt_count >= 5 THEN
    RETURN json_build_object('success', false, 'error', 'Too many attempts. Please try again later.');
  END IF;

  -- Log the attempt
  INSERT INTO public.invite_attempts (user_id) VALUES (v_user_id);

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

  -- Mark successful attempt
  UPDATE public.invite_attempts
  SET success = true
  WHERE user_id = v_user_id
    AND attempt_time = (
      SELECT MAX(attempt_time) 
      FROM public.invite_attempts 
      WHERE user_id = v_user_id
    );

  RETURN json_build_object(
    'success', true, 
    'team_id', v_team_id::text, 
    'team_name', v_team_name
  );
END;
$$;

-- Update regenerate_team_invite_code with cooldown
CREATE OR REPLACE FUNCTION public.regenerate_team_invite_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id UUID;
  v_new_code TEXT;
  v_last_regen TIMESTAMP WITH TIME ZONE;
BEGIN
  v_team_id := get_user_team_id(auth.uid());
  
  IF v_team_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Check cooldown (5 minutes between regenerations)
  SELECT invite_code_regenerated_at INTO v_last_regen
  FROM public.teams WHERE id = v_team_id;
  
  IF v_last_regen IS NOT NULL AND v_last_regen > NOW() - INTERVAL '5 minutes' THEN
    RETURN NULL;
  END IF;

  v_new_code := encode(gen_random_bytes(4), 'hex');
  
  UPDATE public.teams
  SET invite_code = v_new_code, 
      invite_code_regenerated_at = NOW(),
      updated_at = now()
  WHERE id = v_team_id;

  RETURN v_new_code;
END;
$$;

-- Create role_change_audit table
CREATE TABLE IF NOT EXISTS public.role_change_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL,
  changed_by UUID NOT NULL,
  target_user_id UUID NOT NULL,
  old_role TEXT,
  new_role TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.role_change_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs for their teams
CREATE POLICY "Team admins can view audit logs"
ON public.role_change_audit FOR SELECT
USING (public.is_team_owner_or_admin(team_id));

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_role_change_audit_team_time 
ON public.role_change_audit(team_id, changed_at);

-- Update update_member_role with rate limiting
CREATE OR REPLACE FUNCTION public.update_member_role(p_member_user_id uuid, p_new_role text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id UUID;
  v_caller_role TEXT;
  v_old_role TEXT;
  v_recent_changes INT;
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

  -- Rate limit: max 10 role changes per minute per team
  SELECT COUNT(*) INTO v_recent_changes
  FROM public.role_change_audit
  WHERE team_id = v_team_id
    AND changed_at > NOW() - INTERVAL '1 minute';
    
  IF v_recent_changes >= 10 THEN
    RETURN json_build_object('success', false, 'error', 'Too many role changes. Please slow down.');
  END IF;

  -- Cannot demote owner
  SELECT role INTO v_old_role
  FROM public.team_members
  WHERE team_id = v_team_id AND user_id = p_member_user_id;

  IF v_old_role = 'owner' THEN
    RETURN json_build_object('success', false, 'error', 'Cannot change owner role');
  END IF;

  -- Log the change
  INSERT INTO public.role_change_audit (team_id, changed_by, target_user_id, old_role, new_role)
  VALUES (v_team_id, auth.uid(), p_member_user_id, v_old_role, p_new_role);

  -- Update role
  UPDATE public.team_members
  SET role = p_new_role, updated_at = now()
  WHERE team_id = v_team_id AND user_id = p_member_user_id;

  RETURN json_build_object('success', true);
END;
$$;