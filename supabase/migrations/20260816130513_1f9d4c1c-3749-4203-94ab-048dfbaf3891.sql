CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled document',
  icon text NOT NULL DEFAULT '📄',
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  plain_text text NOT NULL DEFAULT '',
  is_archived boolean NOT NULL DEFAULT false,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view documents"
  ON public.documents FOR SELECT TO authenticated
  USING (team_id = public.get_user_team_id(auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "Team members can create documents"
  ON public.documents FOR INSERT TO authenticated
  WITH CHECK (team_id = public.get_user_team_id(auth.uid()));

CREATE POLICY "Team members can update documents"
  ON public.documents FOR UPDATE TO authenticated
  USING (team_id = public.get_user_team_id(auth.uid()))
  WITH CHECK (team_id = public.get_user_team_id(auth.uid()));

CREATE POLICY "Team members can delete documents"
  ON public.documents FOR DELETE TO authenticated
  USING (team_id = public.get_user_team_id(auth.uid()));

CREATE INDEX documents_team_id_idx ON public.documents(team_id);
CREATE INDEX documents_updated_at_idx ON public.documents(updated_at DESC);

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();