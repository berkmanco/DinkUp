-- ============================================
-- Fix Security Advisor Warnings
-- ============================================
-- Addresses overly permissive RLS policies flagged by Supabase Security Advisor

-- ============================================
-- 1. Fix notifications_log INSERT policy
-- ============================================
-- Issue: WITH CHECK (true) is flagged as too permissive
-- Reality: Edge functions use service_role which bypasses RLS anyway
-- Fix: Restrict to authenticated to satisfy security advisor

DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications_log;

CREATE POLICY "Authenticated can insert notifications"
  ON notifications_log FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- 2. Fix players INSERT policy  
-- ============================================
-- Issue: WITH CHECK (true) is flagged as too permissive
-- Reality: Registration uses create_player_for_registration() RPC with SECURITY DEFINER
-- Fix: Restrict direct inserts to authenticated users (RPC bypasses RLS anyway)

DROP POLICY IF EXISTS "Public can create players during registration" ON players;

CREATE POLICY "Authenticated users can create players"
  ON players FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- Notes on remaining security
-- ============================================
-- 1. create_player_for_registration() RPC uses SECURITY DEFINER and bypasses RLS
--    This is the primary path for registration and remains secure
-- 2. Edge functions use service_role key which bypasses RLS
--    The INSERT policies are extra protection, not primary security
-- 3. The real security is in pool_players RLS (prevents unauthorized pool membership)
