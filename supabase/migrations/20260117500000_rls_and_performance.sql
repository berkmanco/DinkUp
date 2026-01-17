-- ============================================
-- Add missing RLS policies and performance indexes
-- ============================================

-- ===================
-- MISSING RLS POLICIES
-- ===================

-- Pool owners can delete their pools
CREATE POLICY "Pool owners can delete pools" ON pools FOR DELETE USING (
  owner_id = (select auth.uid())
);

-- Pool owners can delete registration links
CREATE POLICY "Pool owners can delete registration links" ON registration_links FOR DELETE USING (
  pool_id IN (SELECT id FROM pools WHERE owner_id = (select auth.uid()))
);

-- ===================
-- PERFORMANCE INDEXES
-- ===================
-- These indexes speed up the nested subqueries in RLS policies

-- pool_players lookups (used in most RLS policies)
CREATE INDEX IF NOT EXISTS idx_pool_players_player_id ON pool_players(player_id);
CREATE INDEX IF NOT EXISTS idx_pool_players_pool_id ON pool_players(pool_id);
CREATE INDEX IF NOT EXISTS idx_pool_players_active ON pool_players(player_id, pool_id) WHERE is_active = true;

-- players.user_id (critical for auth checks)
CREATE INDEX IF NOT EXISTS idx_players_user_id ON players(user_id);

-- sessions.pool_id (for session lookups by pool)
CREATE INDEX IF NOT EXISTS idx_sessions_pool_id ON sessions(pool_id);
CREATE INDEX IF NOT EXISTS idx_sessions_proposed_date ON sessions(proposed_date);

-- session_participants lookups
CREATE INDEX IF NOT EXISTS idx_session_participants_session_id ON session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_player_id ON session_participants(player_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_status ON session_participants(player_id, status);

-- payments.session_participant_id
CREATE INDEX IF NOT EXISTS idx_payments_session_participant_id ON payments(session_participant_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- pools.owner_id (for owner checks)
CREATE INDEX IF NOT EXISTS idx_pools_owner_id ON pools(owner_id);

-- registration_links.pool_id
CREATE INDEX IF NOT EXISTS idx_registration_links_pool_id ON registration_links(pool_id);
CREATE INDEX IF NOT EXISTS idx_registration_links_token ON registration_links(token);
