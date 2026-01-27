-- Add new notification types to the notification_type enum
-- Required for player_joined, player_welcome, session_cancelled, and comment_added notifications

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'session_cancelled';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'player_joined';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'comment_added';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'player_welcome';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'commitment_reminder';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'admin_low_commitment';

COMMENT ON TYPE notification_type IS 'Types of notifications: session_created, roster_locked, payment_reminder, session_reminder, waitlist_promoted, session_cancelled, player_joined, comment_added, player_welcome, commitment_reminder, admin_low_commitment';
