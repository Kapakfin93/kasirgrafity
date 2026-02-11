-- =================================================================
-- AUDIT REPORT: SUPABASE SCHEMA COMPATIBILITY
-- DATE: 2026-02-10
-- CONTEXT: OrderSyncService.js uses snake_case for updates.
-- MISSION: Ensure 'public.orders' table has matching columns.
-- =================================================================

-- 1. ENFORCE SNAKE_CASE COLUMNS (Idempotent Ops)
-- We use DO blocks to check existence before adding to avoid crashing.

DO $$
BEGIN
    -- A. production_status (Text)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'production_status') THEN
        ALTER TABLE public.orders ADD COLUMN production_status TEXT DEFAULT 'PENDING';
    END IF;

    -- B. payment_status (Text)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'payment_status') THEN
        ALTER TABLE public.orders ADD COLUMN payment_status TEXT DEFAULT 'UNPAID';
    END IF;

    -- C. paid_amount (Numeric)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'paid_amount') THEN
        ALTER TABLE public.orders ADD COLUMN paid_amount NUMERIC DEFAULT 0;
    END IF;

    -- D. remaining_amount (Numeric)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'remaining_amount') THEN
        ALTER TABLE public.orders ADD COLUMN remaining_amount NUMERIC DEFAULT 0;
    END IF;

    -- E. updated_at (Timestamp)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'updated_at') THEN
        ALTER TABLE public.orders ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- F. assigned_to (Text) - For SPK / Operator
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'assigned_to') THEN
        ALTER TABLE public.orders ADD COLUMN assigned_to TEXT;
    END IF;

    -- G. cancel_reason (Text)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'cancel_reason') THEN
        ALTER TABLE public.orders ADD COLUMN cancel_reason TEXT;
    END IF;

    -- H. cancelled_at (Timestamp)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'cancelled_at') THEN
        ALTER TABLE public.orders ADD COLUMN cancelled_at TIMESTAMPTZ;
    END IF;

    -- I. financial_action (Text)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'financial_action') THEN
        ALTER TABLE public.orders ADD COLUMN financial_action TEXT DEFAULT 'NONE';
    END IF;

END $$;

-- 2. VERIFY MIGRATION
-- This query is just for you to run manually to check the result
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders';
