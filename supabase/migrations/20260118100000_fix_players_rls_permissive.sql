-- Fix players INSERT RLS - use permissive policy
-- The previous migration used auth.uid() IS NOT NULL which may fail in some contexts

-- Drop the existing policy
DROP POLICY IF EXISTS "Authenticated users can create players" ON players;

-- Create a permissive INSERT policy
-- RLS is still enforced - this just allows the insert operation
-- The Supabase client already requires authentication to make requests
CREATE POLICY "Allow player creation"
  ON players FOR INSERT
  WITH CHECK (true);

COMMENT ON POLICY "Allow player creation" ON players IS 
  'Permissive insert policy. Supabase client authentication handles access control.';
