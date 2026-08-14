CREATE POLICY "Users can delete their own profile"
ON public.profiles FOR DELETE
USING (id = auth.uid());

ALTER TABLE public.teams
ADD CONSTRAINT teams_name_length_check
CHECK (length(name) >= 1 AND length(name) <= 100);

CREATE OR REPLACE FUNCTION public.update_member_role(p_member_user_id uuid, p_new_role text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_team_id UUID;
  v_caller_role TEXT;
  v_old_role TEXT;
  v_recent_changes INT;
BEGIN
  IF p_member_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid member');
  END IF;

  IF p_new_role IS NULL OR p_new_role NOT IN ('owner', 'admin', 'member', 'dev', 'reader') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid role. Must be: owner, admin, member, dev, or reader');
  END IF;

  v_team_id := get_user_team_id(auth.uid());

  IF v_team_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not in a team');
  END IF;

  SELECT role INTO v_caller_role
  FROM public.team_members
  WHERE team_id = v_team_id AND user_id = auth.uid();

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  SELECT COUNT(*) INTO v_recent_changes
  FROM public.role_change_audit
  WHERE team_id = v_team_id
    AND changed_at > NOW() - INTERVAL '1 minute';

  IF v_recent_changes >= 10 THEN
    RETURN json_build_object('success', false, 'error', 'Too many role changes. Please slow down.');
  END IF;

  SELECT role INTO v_old_role
  FROM public.team_members
  WHERE team_id = v_team_id AND user_id = p_member_user_id;

  IF v_old_role IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Member not found in your team');
  END IF;

  IF v_old_role = 'owner' THEN
    RETURN json_build_object('success', false, 'error', 'Cannot change owner role');
  END IF;

  INSERT INTO public.role_change_audit (team_id, changed_by, target_user_id, old_role, new_role)
  VALUES (v_team_id, auth.uid(), p_member_user_id, v_old_role, p_new_role);

  UPDATE public.team_members
  SET role = p_new_role, updated_at = now()
  WHERE team_id = v_team_id AND user_id = p_member_user_id;

  RETURN json_build_object('success', true);
END;
$function$;