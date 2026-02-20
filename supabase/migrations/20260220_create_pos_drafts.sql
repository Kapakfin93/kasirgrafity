-- Migration: Create POS Drafts Table (User Isolation)
-- Date: 2026-02-20
-- Description: Stores pending estimates/drafts with RLS for owner isolation.

-- 1. Create Table
CREATE TABLE IF NOT EXISTS public.pos_drafts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_by UUID NOT NULL REFERENCES auth.users(id), -- 🔒 SECURITY: Owner Isolation
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'), -- 🧹 EXPIRY
    active_since TIMESTAMPTZ, -- ⏱️ TIMEOUT GUARD
    
    customer_name TEXT,
    customer_phone TEXT,
    total_amount NUMERIC,
    discount_amount NUMERIC DEFAULT 0,
    items_json JSONB NOT NULL, -- Snapshot Cart { version: 1, ... }
    
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE'))
);

-- 2. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_pos_drafts_user_active 
ON public.pos_drafts (created_by, status, expires_at);

-- 3. Enable RLS
ALTER TABLE public.pos_drafts ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policy: Owner Isolation (User can only see their own drafts)
-- Drop if exists to ensure idempotency during re-runs
DROP POLICY IF EXISTS "owner_isolation" ON public.pos_drafts;

CREATE POLICY "owner_isolation" ON public.pos_drafts
FOR ALL 
USING (created_by = auth.uid());

-- 5. Grant Permissions (Standard)
GRANT ALL ON public.pos_drafts TO authenticated;
GRANT ALL ON public.pos_drafts TO service_role;
