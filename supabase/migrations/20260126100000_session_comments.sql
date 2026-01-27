-- ============================================
-- Session Comments Feature
-- ============================================
-- Allow pool members to comment on sessions for coordination and communication

-- Create session_comments table
CREATE TABLE IF NOT EXISTS session_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_session_comments_session_id ON session_comments(session_id);
CREATE INDEX IF NOT EXISTS idx_session_comments_player_id ON session_comments(player_id);
CREATE INDEX IF NOT EXISTS idx_session_comments_created_at ON session_comments(created_at DESC);

-- Enable RLS
ALTER TABLE session_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies:
-- 1. Pool members can read comments on their sessions
CREATE POLICY "Pool members can read comments on their sessions"
  ON session_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions s
      JOIN pool_players pp ON pp.pool_id = s.pool_id
      WHERE s.id = session_comments.session_id
      AND pp.player_id IN (
        SELECT id FROM players WHERE user_id = auth.uid()
      )
      AND pp.is_active = true
    )
  );

-- 2. Pool members can create comments on their sessions
CREATE POLICY "Pool members can create comments on their sessions"
  ON session_comments
  FOR INSERT
  WITH CHECK (
    player_id IN (
      SELECT id FROM players WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM sessions s
      JOIN pool_players pp ON pp.pool_id = s.pool_id
      WHERE s.id = session_comments.session_id
      AND pp.player_id = session_comments.player_id
      AND pp.is_active = true
    )
  );

-- 3. Users can update their own comments
CREATE POLICY "Users can update their own comments"
  ON session_comments
  FOR UPDATE
  USING (
    player_id IN (
      SELECT id FROM players WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    player_id IN (
      SELECT id FROM players WHERE user_id = auth.uid()
    )
  );

-- 4. Users can delete their own comments
CREATE POLICY "Users can delete their own comments"
  ON session_comments
  FOR DELETE
  USING (
    player_id IN (
      SELECT id FROM players WHERE user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_session_comment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_session_comment_updated_at
  BEFORE UPDATE ON session_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_session_comment_updated_at();
