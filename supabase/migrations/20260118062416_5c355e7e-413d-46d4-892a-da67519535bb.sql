-- Update check constraint to include 'viewer' role
ALTER TABLE public.team_members DROP CONSTRAINT team_members_role_check;

ALTER TABLE public.team_members ADD CONSTRAINT team_members_role_check 
  CHECK (role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text, 'dev'::text, 'reader'::text, 'viewer'::text]));