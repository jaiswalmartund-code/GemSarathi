-- Migration 003: enable Realtime on app tables (run once in SQL Editor).
-- Without this, postgres_changes subscriptions connect but never fire.
-- Safe to re-run (skips tables already added).
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','vendors','tenders','tender_requirements','bids','compliance_results','evaluations','contract_awards','audit_logs','documents']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
    END IF;
  END LOOP;
END $$;
