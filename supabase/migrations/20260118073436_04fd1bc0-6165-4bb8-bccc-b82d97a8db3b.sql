-- Allow super admins and admins to insert team members on behalf of other users
CREATE POLICY "Admins can add members to any team" 
ON public.team_members 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE admin_users.user_id = auth.uid()
  )
);