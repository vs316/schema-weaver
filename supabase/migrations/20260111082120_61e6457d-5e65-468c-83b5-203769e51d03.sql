-- Allow authenticated users to create teams
CREATE POLICY "Authenticated users can create teams"
ON public.teams
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to insert into team_members when creating a team
-- (They need to add themselves as owner)
CREATE POLICY "Authenticated users can add themselves to teams"
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());