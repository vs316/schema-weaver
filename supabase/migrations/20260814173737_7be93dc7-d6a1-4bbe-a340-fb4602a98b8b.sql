CREATE TABLE public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text NOT NULL DEFAULT 'dark',
  font_family text NOT NULL DEFAULT 'sans',
  ui_scale text NOT NULL DEFAULT 'md',
  density text NOT NULL DEFAULT 'cozy',
  reduced_motion boolean NOT NULL DEFAULT false,
  sidebar_collapsed boolean NOT NULL DEFAULT false,
  extras jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_settings_theme_check CHECK (theme IN ('dark','light','system','contrast')),
  CONSTRAINT user_settings_font_check CHECK (font_family IN ('sans','serif','mono','system')),
  CONSTRAINT user_settings_scale_check CHECK (ui_scale IN ('sm','md','lg')),
  CONSTRAINT user_settings_density_check CHECK (density IN ('compact','cozy','comfortable'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
GRANT ALL ON public.user_settings TO service_role;

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own settings"
ON public.user_settings
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();