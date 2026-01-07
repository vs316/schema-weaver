-- Add invite code to teams table for joining teams
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- Generate unique invite codes for existing teams
UPDATE public.teams 
SET invite_code = encode(gen_random_bytes(4), 'hex')
WHERE invite_code IS NULL;

-- Make invite_code NOT NULL going forward
ALTER TABLE public.teams ALTER COLUMN invite_code SET NOT NULL;
ALTER TABLE public.teams ALTER COLUMN invite_code SET DEFAULT encode(gen_random_bytes(4), 'hex');

-- Create index for fast invite code lookups
CREATE INDEX IF NOT EXISTS idx_teams_invite_code ON public.teams(invite_code);

-- Allow anyone to look up a team by invite code (for joining)
CREATE POLICY "Anyone can lookup team by invite code"
ON public.teams
FOR SELECT
USING (true);

-- Drop old restrictive policy if it exists
DROP POLICY IF EXISTS "Users can view their own team" ON public.teams;

-- Allow team members to update their team (e.g., rename)
CREATE POLICY "Team members can update their team"
ON public.teams
FOR UPDATE
USING (id = get_user_team_id(auth.uid()));

-- Function to join a team by invite code
CREATE OR REPLACE FUNCTION public.join_team_by_invite(p_invite_code TEXT)
RETURNS JSON
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

  RETURN json_build_object(
    'success', true, 
    'team_id', v_team_id::text, 
    'team_name', v_team_name
  );
END;
$$;

-- Function to regenerate invite code
CREATE OR REPLACE FUNCTION public.regenerate_team_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id UUID;
  v_new_code TEXT;
BEGIN
  v_team_id := get_user_team_id(auth.uid());
  
  IF v_team_id IS NULL THEN
    RETURN NULL;
  END IF;

  v_new_code := encode(gen_random_bytes(4), 'hex');
  
  UPDATE public.teams
  SET invite_code = v_new_code, updated_at = now()
  WHERE id = v_team_id;

  RETURN v_new_code;
END;
$$;