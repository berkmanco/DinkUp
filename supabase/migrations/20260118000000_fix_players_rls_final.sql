-- Fix players INSERT RLS policy (final fix)
-- This migration ensures authenticated users can create players

-- Drop ALL existing INSERT policies on players to avoid conflicts
DROP POLICY IF EXISTS "Public can create players during registration" ON players;
DROP POLICY IF EXISTS "Authenticated users can create players" ON players;
DROP POLICY IF EXISTS "Service role can create players" ON players;
DROP POLICY IF EXISTS "Players insert policy" ON players;

-- Create a single, clear INSERT policy
-- Any authenticated user can create a player record
CREATE POLICY "Authenticated users can create players"
  ON players FOR INSERT
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- Verify the policy exists
COMMENT ON POLICY "Authenticated users can create players" ON players IS 
  'Allows any authenticated user to create player records. Used when pool owners manually add players.';
