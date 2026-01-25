-- Remove pool_invitation notification type (not implemented)
-- This type was included in initial migration but is not actually used

ALTER TABLE notification_preferences
  DROP CONSTRAINT IF EXISTS notification_preferences_notification_type_check;

ALTER TABLE notification_preferences
  ADD CONSTRAINT notification_preferences_notification_type_check
  CHECK (notification_type IN (
    'session_reminder_24h',
    'payment_request',
    'payment_reminder',
    'waitlist_promotion',
    'session_cancelled'
  ));

-- Clean up any existing pool_invitation rows
DELETE FROM notification_preferences WHERE notification_type = 'pool_invitation';

COMMENT ON COLUMN notification_preferences.notification_type IS 'Type of notification: session_reminder_24h, payment_request, payment_reminder, waitlist_promotion, session_cancelled';
