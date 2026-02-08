-- =============================================
-- MIGRATION: ADD EMPLOYEE_ID TO EXPENSES
-- Date: 2026-02-09
-- Purpose: Enable Relational HR Aggregation
-- =============================================

-- Safety Check: Add column only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'expenses'
        AND column_name = 'employee_id'
    ) THEN
        -- 1. Add the column (Nullable first for safety)
        ALTER TABLE public.expenses
        ADD COLUMN employee_id UUID;

        -- 2. Add Foreign Key Constraint
        ALTER TABLE public.expenses
        ADD CONSTRAINT fk_expenses_employee
        FOREIGN KEY (employee_id)
        REFERENCES public.employees(id)
        ON DELETE SET NULL; -- If employee deleted, keep expense but unlink

        -- 3. Create Index for Performance
        CREATE INDEX idx_expenses_employee_id ON public.expenses(employee_id);
    END IF;
END $$;
