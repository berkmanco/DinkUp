-- ============================================
-- AUTOMATED NOTIFICATION CRON JOBS
-- ============================================
-- 
-- Prerequisites (enable in Supabase Dashboard > Database > Extensions):
-- 1. pg_cron - for scheduling jobs
-- 2. pg_net - for HTTP requests to edge functions
--
-- After running this migration, you need to manually schedule the cron jobs.
-- See the SETUP section at the bottom of this file.

-- ============================================
-- HELPER FUNCTIONS: Find sessions needing notifications
-- ============================================

-- Sessions happening TOMORROW that need a reminder
CREATE OR REPLACE FUNCTION get_sessions_needing_reminders()
RETURNS TABLE (session_id uuid, proposed_date date, proposed_time time)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.proposed_date, s.proposed_time
  FROM sessions s
  WHERE s.status IN ('proposed', 'confirmed')
    AND s.proposed_date = CURRENT_DATE + INTERVAL '1 day'
    AND NOT EXISTS (
      SELECT 1 FROM notifications_log nl
      WHERE nl.session_id = s.id
        AND nl.notification_type = 'session_reminder'
        AND nl.sent_at > CURRENT_TIMESTAMP - INTERVAL '20 hours'
    );
END;
$$;

-- Sessions 2-3 days away with uncommitted players
CREATE OR REPLACE FUNCTION get_sessions_needing_commitment_reminders()
RETURNS TABLE (session_id uuid, proposed_date date, committed_count bigint, min_players integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id, 
    s.proposed_date,
    (SELECT COUNT(*) FROM session_participants sp 
     WHERE sp.session_id = s.id AND sp.status IN ('committed', 'paid')) as committed_count,
    s.min_players
  FROM sessions s
  WHERE s.status = 'proposed'
    AND s.roster_locked = false
    AND s.proposed_date BETWEEN CURRENT_DATE + INTERVAL '2 days' AND CURRENT_DATE + INTERVAL '3 days'
    AND NOT EXISTS (
      SELECT 1 FROM notifications_log nl
      WHERE nl.session_id = s.id
        AND nl.notification_type = 'commitment_reminder'
        AND nl.sent_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
    );
END;
$$;

-- Sessions with low commitment (below minimum) that need admin alert
CREATE OR REPLACE FUNCTION get_sessions_needing_admin_alerts()
RETURNS TABLE (session_id uuid, proposed_date date, committed_count bigint, min_players integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id, 
    s.proposed_date,
    (SELECT COUNT(*) FROM session_participants sp 
     WHERE sp.session_id = s.id AND sp.status IN ('committed', 'paid')) as committed_count,
    s.min_players
  FROM sessions s
  WHERE s.status IN ('proposed', 'confirmed')
    AND s.roster_locked = false
    -- 2-3 days away
    AND s.proposed_date BETWEEN CURRENT_DATE + INTERVAL '2 days' AND CURRENT_DATE + INTERVAL '3 days'
    -- Below minimum
    AND (SELECT COUNT(*) FROM session_participants sp 
         WHERE sp.session_id = s.id AND sp.status IN ('committed', 'paid')) < s.min_players
    -- Haven't alerted recently
    AND NOT EXISTS (
      SELECT 1 FROM notifications_log nl
      WHERE nl.session_id = s.id
        AND nl.notification_type = 'admin_low_commitment'
        AND nl.sent_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
    );
END;
$$;

-- Locked sessions with unpaid participants 1-2 days before
CREATE OR REPLACE FUNCTION get_sessions_needing_payment_reminders()
RETURNS TABLE (session_id uuid, proposed_date date, unpaid_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id, 
    s.proposed_date,
    (SELECT COUNT(*) FROM payments p
     JOIN session_participants sp ON p.session_participant_id = sp.id
     WHERE sp.session_id = s.id AND p.status = 'pending') as unpaid_count
  FROM sessions s
  WHERE s.status = 'confirmed'
    AND s.roster_locked = true
    AND s.proposed_date BETWEEN CURRENT_DATE + INTERVAL '1 day' AND CURRENT_DATE + INTERVAL '2 days'
    AND EXISTS (
      SELECT 1 FROM payments p
      JOIN session_participants sp ON p.session_participant_id = sp.id
      WHERE sp.session_id = s.id AND p.status = 'pending'
    )
    AND NOT EXISTS (
      SELECT 1 FROM notifications_log nl
      WHERE nl.session_id = s.id
        AND nl.notification_type = 'payment_reminder'
        AND nl.sent_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
    );
END;
$$;

-- ============================================
-- CRON JOB FUNCTIONS: Call edge functions
-- ============================================

-- Master function to send all automated notifications
-- Called by pg_cron, loops through sessions and calls edge function
CREATE OR REPLACE FUNCTION run_automated_notifications()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_record RECORD;
  edge_url TEXT;
  results jsonb := '{"session_reminders": 0, "commitment_reminders": 0, "admin_alerts": 0, "payment_reminders": 0}'::jsonb;
BEGIN
  -- Edge function URL (Supabase project URL + /functions/v1)
  edge_url := 'https://zypmcxulznrmzqaflkui.supabase.co/functions/v1';

  -- 1. Session reminders (24h before)
  FOR session_record IN SELECT * FROM get_sessions_needing_reminders()
  LOOP
    PERFORM net.http_post(
      url := edge_url || '/notify',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('type', 'session_reminder', 'sessionId', session_record.session_id::text)
    );
    results := jsonb_set(results, '{session_reminders}', to_jsonb((results->>'session_reminders')::int + 1));
  END LOOP;

  -- 2. Commitment reminders (2-3 days before)
  FOR session_record IN SELECT * FROM get_sessions_needing_commitment_reminders()
  LOOP
    PERFORM net.http_post(
      url := edge_url || '/notify',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('type', 'commitment_reminder', 'sessionId', session_record.session_id::text)
    );
    results := jsonb_set(results, '{commitment_reminders}', to_jsonb((results->>'commitment_reminders')::int + 1));
  END LOOP;

  -- 3. Admin low commitment alerts
  FOR session_record IN SELECT * FROM get_sessions_needing_admin_alerts()
  LOOP
    PERFORM net.http_post(
      url := edge_url || '/notify',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('type', 'admin_low_commitment', 'sessionId', session_record.session_id::text)
    );
    results := jsonb_set(results, '{admin_alerts}', to_jsonb((results->>'admin_alerts')::int + 1));
  END LOOP;

  -- 4. Payment reminders
  FOR session_record IN SELECT * FROM get_sessions_needing_payment_reminders()
  LOOP
    PERFORM net.http_post(
      url := edge_url || '/notify',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := jsonb_build_object('type', 'payment_reminder', 'sessionId', session_record.session_id::text)
    );
    results := jsonb_set(results, '{payment_reminders}', to_jsonb((results->>'payment_reminders')::int + 1));
  END LOOP;

  RAISE NOTICE 'Automated notifications sent: %', results;
  RETURN results;
END;
$$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION get_sessions_needing_reminders IS 'Returns sessions happening tomorrow that need reminder notifications';
COMMENT ON FUNCTION get_sessions_needing_commitment_reminders IS 'Returns sessions 2-3 days away with uncommitted players';
COMMENT ON FUNCTION get_sessions_needing_admin_alerts IS 'Returns sessions below minimum commitment that need admin alerts';
COMMENT ON FUNCTION get_sessions_needing_payment_reminders IS 'Returns locked sessions with unpaid participants';
COMMENT ON FUNCTION run_automated_notifications IS 'Master cron function that sends all automated notifications';

-- ============================================
-- SETUP INSTRUCTIONS
-- ============================================
-- 
-- After enabling pg_cron and pg_net extensions, run this in the SQL Editor:
--
-- -- Schedule daily at 9am Eastern (2pm UTC)
-- SELECT cron.schedule(
--   'daily-notifications',
--   '0 14 * * *',  -- 2pm UTC = 9am ET
--   $$SELECT run_automated_notifications()$$
-- );
--
-- -- View scheduled jobs:
-- SELECT * FROM cron.job;
--
-- -- View job run history:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
--
-- -- Test run manually:
-- SELECT run_automated_notifications();
--
-- -- Unschedule:
-- SELECT cron.unschedule('daily-notifications');
