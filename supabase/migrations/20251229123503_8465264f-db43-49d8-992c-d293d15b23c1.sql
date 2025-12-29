-- Create teams table
CREATE TABLE public.teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table linked to auth.users
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ERD diagrams table
CREATE TABLE public.erd_diagrams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Untitled Diagram',
  tables JSONB NOT NULL DEFAULT '[]'::jsonb,
  relations JSONB NOT NULL DEFAULT '[]'::jsonb,
  viewport JSONB NOT NULL DEFAULT '{"x": 0, "y": 0, "zoom": 1}'::jsonb,
  is_dark_mode BOOLEAN NOT NULL DEFAULT true,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erd_diagrams ENABLE ROW LEVEL SECURITY;

-- Function to get user's team_id
CREATE OR REPLACE FUNCTION public.get_user_team_id(user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id FROM public.profiles WHERE id = user_id
$$;

-- Teams policies
CREATE POLICY "Users can view their own team"
ON public.teams FOR SELECT
USING (id = public.get_user_team_id(auth.uid()));

-- Profiles policies
CREATE POLICY "Users can view profiles in their team"
ON public.profiles FOR SELECT
USING (team_id = public.get_user_team_id(auth.uid()) OR id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (id = auth.uid());

-- ERD Diagrams policies (team-based access)
CREATE POLICY "Team members can view diagrams"
ON public.erd_diagrams FOR SELECT
USING (team_id = public.get_user_team_id(auth.uid()));

CREATE POLICY "Team members can create diagrams"
ON public.erd_diagrams FOR INSERT
WITH CHECK (team_id = public.get_user_team_id(auth.uid()));

CREATE POLICY "Team members can update diagrams"
ON public.erd_diagrams FOR UPDATE
USING (team_id = public.get_user_team_id(auth.uid()));

CREATE POLICY "Team members can delete diagrams"
ON public.erd_diagrams FOR DELETE
USING (team_id = public.get_user_team_id(auth.uid()));

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply updated_at triggers
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_erd_diagrams_updated_at
  BEFORE UPDATE ON public.erd_diagrams
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_team_id UUID;
BEGIN
  -- Create a default team for the user if none exists
  INSERT INTO public.teams (name) VALUES (COALESCE(NEW.email, 'My Team') || '''s Team')
  RETURNING id INTO default_team_id;
  
  -- Create the profile
  INSERT INTO public.profiles (id, email, display_name, team_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.email),
    default_team_id
  );
  RETURN NEW;
END;
$$;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for erd_diagrams
ALTER PUBLICATION supabase_realtime ADD TABLE public.erd_diagrams;