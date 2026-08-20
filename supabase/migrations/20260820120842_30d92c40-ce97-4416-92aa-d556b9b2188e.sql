ALTER TABLE public.erd_diagrams
  ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_trashed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS trashed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS folder text,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS erd_diagrams_team_trashed_idx ON public.erd_diagrams (team_id, is_trashed);

CREATE TABLE IF NOT EXISTS public.diagram_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagram_id uuid NOT NULL REFERENCES public.erd_diagrams(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Snapshot',
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS diagram_versions_diagram_idx ON public.diagram_versions (diagram_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.diagram_versions TO authenticated;
GRANT ALL ON public.diagram_versions TO service_role;

ALTER TABLE public.diagram_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view versions"
  ON public.diagram_versions FOR SELECT TO authenticated
  USING (team_id = public.get_user_team_id(auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "Team members can create versions"
  ON public.diagram_versions FOR INSERT TO authenticated
  WITH CHECK (team_id = public.get_user_team_id(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Authors or team admins can delete versions"
  ON public.diagram_versions FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_team_owner_or_admin(team_id));