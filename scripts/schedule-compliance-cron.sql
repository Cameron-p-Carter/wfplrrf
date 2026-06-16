-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor).
-- Do NOT commit this file to git after filling in the service role key.
--
-- Prerequisites:
--   1. pg_cron and pg_net extensions must be enabled (Dashboard → Extensions)
--   2. The send-friday-compliance Edge Function must be deployed:
--      npx supabase functions deploy send-friday-compliance
--   3. SLACK_BOT_TOKEN must be set in Edge Function secrets (Dashboard → Edge Functions → Secrets)

-- Enable required extensions (safe to run if already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any existing schedule with this name before recreating (safe if not exists)
DO $$
BEGIN
  PERFORM cron.unschedule('send-friday-compliance-slack');
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

-- Schedule: every Friday at 9:00 AM AEST = Thursday 23:00 UTC
-- During AEDT (daylight saving, UTC+11) this fires at 10:00 AM AEDT — acceptable
SELECT cron.schedule(
  'send-friday-compliance-slack',
  '0 23 * * 4',
  $$
  SELECT net.http_post(
    url     := 'https://ckgyrglbfmsidtibohfs.supabase.co/functions/v1/send-friday-compliance',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrZ3lyZ2xiZm1zaWR0aWJvaGZzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDkxMTY5OCwiZXhwIjoyMDk2NDg3Njk4fQ.S9HsMmqBS3AmY7jWhiLww3peMZfBzeoqcNDRDSFF6aI'
    ),
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Verify the schedule was created
SELECT jobid, jobname, schedule, command FROM cron.job WHERE jobname = 'send-friday-compliance-slack';
