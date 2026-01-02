-- Ensure a newly authenticated user has a profile + team.
-- Avoids relying on triggers in reserved schemas.

CREATE OR REPLACE FUNCTION public.ensure_profile()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
  existing_team_id uuid;
  created_team_id uuid;
  claims jsonb;
  email text;
  display_name text;
BEGIN
  uid := auth.uid();
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT team_id
  INTO existing_team_id
  FROM public.profiles
  WHERE id = uid;

  IF existing_team_id IS NOT NULL THEN
    RETURN existing_team_id;
  END IF;

  claims := COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
  email := NULLIF(claims->>'email', '');
  display_name := NULLIF((claims->'user_metadata'->>'display_name'), '');
  IF display_name IS NULL AND email IS NOT NULL THEN
    display_name := NULLIF(split_part(email, '@', 1), '');
  END IF;
  display_name := COALESCE(display_name, 'User');

  -- Create a team for the user
  INSERT INTO public.teams (name)
  VALUES (COALESCE(email, display_name) || '''s Team')
  RETURNING id INTO created_team_id;

  -- Upsert profile with team
  INSERT INTO public.profiles (id, email, display_name, team_id)
  VALUES (uid, email, display_name, created_team_id)
  ON CONFLICT (id)
  DO UPDATE SET
    team_id = COALESCE(public.profiles.team_id, EXCLUDED.team_id),
    email = COALESCE(public.profiles.email, EXCLUDED.email),
    display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name),
    updated_at = now();

  RETURN created_team_id;
END;
$$;