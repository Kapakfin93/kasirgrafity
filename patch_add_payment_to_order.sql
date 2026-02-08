-- =============================================
-- PATCH: ADD_PAYMENT_TO_ORDER (AUTO-SETTLEMENT)
-- Purpose: 
-- 1. Insert Payment Record
-- 2. AUTO-UPDATE Order Status & Remaining Amount (Critical)
-- =============================================

CREATE OR REPLACE FUNCTION add_payment_to_order(
    p_order_id UUID,
    p_amount NUMERIC,
    p_user_name TEXT,
    p_payment_method TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_amount NUMERIC;
    v_paid_amount NUMERIC;
    v_new_paid_amount NUMERIC;
    v_new_remaining NUMERIC;
    v_payment_status TEXT;
    v_payment_id UUID;
BEGIN
    -- 1. GET CURRENT ORDER STATE (Lock Row)
    SELECT total_amount, paid_amount 
    INTO v_total_amount, v_paid_amount
    FROM orders 
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Order not found');
    END IF;

    -- 2. CALCULATE NEW STATE
    v_new_paid_amount := COALESCE(v_paid_amount, 0) + p_amount;
    v_new_remaining := v_total_amount - v_new_paid_amount;

    -- 3. DETERMINE STATUS
    IF v_new_remaining <= 50 THEN -- Tolerance for float rounding
        v_payment_status := 'PAID';
        v_new_remaining := 0; -- Clean up small decimals
    ELSE
        v_payment_status := 'PARTIAL';
    END IF;

    -- 4. INSERT PAYMENT RECORD
    INSERT INTO order_payments (
        order_id,
        amount,
        payment_method,
        received_by,
        created_at
    ) VALUES (
        p_order_id,
        p_amount,
        p_payment_method,
        p_user_name,
        NOW()
    ) RETURNING id INTO v_payment_id;

    -- 5. UPDATE ORDER (CRITICAL STEP)
    UPDATE orders 
    SET 
        paid_amount = v_new_paid_amount,
        remaining_amount = v_new_remaining,
        payment_status = v_payment_status,
        updated_at = NOW()
    WHERE id = p_order_id;

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', v_payment_id,
        'new_status', v_payment_status,
        'remaining', v_new_remaining
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;
