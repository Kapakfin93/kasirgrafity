-- =============================================
-- ENABLE REALTIME FOR EXPENSES
-- Migration: 20260208_enable_expense_realtime.sql
-- Description: Explicitly add 'expenses' table to supabase_realtime publication
-- =============================================

-- Ensure the publication exists (Supabase default)
-- Then add the table to it.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'expenses'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
  END IF;
END $$;
