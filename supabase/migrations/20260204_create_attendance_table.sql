-- =============================================
-- ATTENDANCE TABLE - AGILE SCHEMA
-- Migration: 20260204_create_attendance_table.sql
-- No PIN requirement, Night shift support
-- =============================================

-- Create attendance table
CREATE TABLE IF NOT EXISTS public.attendance (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Employee Reference
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    
    -- Date & Time
    date DATE NOT NULL,
    check_in_time TIMESTAMPTZ NOT NULL,
    check_out_time TIMESTAMPTZ,  -- Nullable until check-out
    work_hours NUMERIC(5, 2),     -- Calculated work hours (e.g., 8.50)
    
    -- Status & Metadata
    status TEXT NOT NULL DEFAULT 'PRESENT',  -- PRESENT | LATE | ABSENT
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Unique constraint: one attendance record per employee per date
    CONSTRAINT unique_employee_date UNIQUE (employee_id, date)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON public.attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON public.attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON public.attendance(status);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated users (Owner) can access
CREATE POLICY "attendance_owner_policy" ON public.attendance
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- =============================================
-- TRIGGER: Auto-update updated_at timestamp
-- =============================================

DROP TRIGGER IF EXISTS trigger_attendance_updated_at ON public.attendance;
CREATE TRIGGER trigger_attendance_updated_at
    BEFORE UPDATE ON public.attendance
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- COMMENT: Schema notes
-- - check_in_time: Required when creating record
-- - check_out_time: NULL until employee checks out
-- - work_hours: Calculated by app (handles night shift)
-- - Unique constraint ensures one record per employee per day
-- =============================================
