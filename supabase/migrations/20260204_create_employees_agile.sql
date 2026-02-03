-- =============================================
-- EMPLOYEES TABLE - AGILE SCHEMA
-- Migration: 20260204_create_employees_agile.sql
-- Approved by CTO: 2026-02-04
-- =============================================

-- Create employees table
CREATE TABLE IF NOT EXISTS public.employees (
    -- Primary Key (UUID for system compatibility)
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Core Fields
    name TEXT NOT NULL,
    role TEXT NOT NULL,                    -- AGILE: Free TEXT, not ENUM
    pin TEXT NOT NULL,                     -- 4-digit PIN (validation in app layer)
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE | INACTIVE
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    
    -- NOTE: NO shift column per requirements
);

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_name ON public.employees(name);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on the table
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated users (Owner) can access
CREATE POLICY "employees_owner_policy" ON public.employees
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- =============================================
-- TRIGGER: Auto-update updated_at timestamp
-- =============================================

-- Function to update timestamp (create if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to employees table
DROP TRIGGER IF EXISTS trigger_employees_updated_at ON public.employees;
CREATE TRIGGER trigger_employees_updated_at
    BEFORE UPDATE ON public.employees
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- COMMENT: Schema verified for Agile requirements
-- - role: TEXT (free input)
-- - shift: NOT PRESENT (removed)
-- - RLS: enabled with owner policy
-- =============================================
