-- =============================================
-- EXPENSES TABLE - CLOUD SYNC
-- Migration: 20260204_create_expenses_table.sql
-- Supports BON category and cash drawer integration
-- =============================================

-- Create expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Expense Details
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    amount NUMERIC(12, 2) NOT NULL,
    category TEXT NOT NULL,  -- OPERATIONAL | SALARY | BON | MATERIAL | OTHER
    description TEXT,
    
    -- Employee Info (for Salary/Bon)
    employee_name TEXT,  -- Nullable, only filled for SALARY/BON expenses
    
    -- Audit Fields
    created_by TEXT NOT NULL,  -- Cashier/Owner name who created the expense
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_amount CHECK (amount > 0),
    CONSTRAINT valid_category CHECK (category IN ('OPERATIONAL', 'SALARY', 'BON', 'MATERIAL', 'OTHER'))
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON public.expenses(created_by);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated users (Owner) can access
CREATE POLICY "expenses_owner_policy" ON public.expenses
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- =============================================
-- TRIGGER: Auto-update updated_at timestamp
-- =============================================

DROP TRIGGER IF EXISTS trigger_expenses_updated_at ON public.expenses;
CREATE TRIGGER trigger_expenses_updated_at
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- COMMENT: Schema notes
-- - category: BON added for kasbon/hutang tracking
-- - employee_name: Only filled for SALARY/BON categories
-- - amount: Always positive (check constraint)
-- - Cash drawer deduction handled by application layer
-- =============================================
