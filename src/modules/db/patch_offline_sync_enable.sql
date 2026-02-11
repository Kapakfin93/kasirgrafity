-- =============================================
-- MIGRATION: ENABLE OFFLINE SYNC (RESILIENCE)
-- =============================================

-- 1. ADD COLUMNS FOR OFFLINE TRACKING
-- ---------------------------------------------
DO $$ 
BEGIN
    -- Add ref_local_id if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='ref_local_id') THEN
        ALTER TABLE public.orders ADD COLUMN ref_local_id TEXT;
    END IF;

    -- Add local_created_at if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='local_created_at') THEN
        ALTER TABLE public.orders ADD COLUMN local_created_at TIMESTAMPTZ;
    END IF;
END $$;

-- 2. CREATE UNIQUE INDEX (PREVENT DUPLICATES)
-- ---------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_ref_local_id 
ON public.orders(ref_local_id) 
WHERE ref_local_id IS NOT NULL;


-- 3. UPGRADE RPC: create_pos_order_notary
--    Features: Idempotency, Customer Upsert, Time Travel
-- ---------------------------------------------
CREATE OR REPLACE FUNCTION create_pos_order_notary(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_customer_id UUID;
    v_input_customer_id TEXT;
    v_order_number TEXT;
    v_items JSONB;
    v_item JSONB;
    v_total_amount NUMERIC;
    v_paid_amount NUMERIC;
    v_discount_amount NUMERIC;
    v_remaining_amount NUMERIC;
    v_payment_status TEXT;
    v_is_tempo BOOLEAN;
    v_production_status TEXT;
    v_meta JSONB;
    v_item_subtotal NUMERIC;
    v_calculated_total NUMERIC := 0;
    
    -- Sync Variables
    v_existing_id UUID;
    v_local_ref TEXT;
    v_created_at TIMESTAMPTZ;
BEGIN
    -- A. IDEMPOTENCY CHECK (CRITICAL)
    v_local_ref := p_payload->>'ref_local_id';
    IF v_local_ref IS NOT NULL THEN
        SELECT id INTO v_existing_id FROM orders WHERE ref_local_id = v_local_ref;
        IF v_existing_id IS NOT NULL THEN
            -- Retrieve existing order number for sync confirmation
            SELECT order_number INTO v_order_number FROM orders WHERE id = v_existing_id;
            
            RETURN jsonb_build_object(
                'success', true,
                'order_id', v_existing_id,
                'order_number', v_order_number,
                'status', 'ALREADY_SYNCED',
                'description', 'Idempotent skip: Order already exists.'
            );
        END IF;
    END IF;

    -- 1. EXTRACT PAYLOAD
    v_items := p_payload->'items';
    v_meta := p_payload->'meta';
    
    -- B. TIME TRAVEL (Preserve Offline Timestamp)
    v_created_at := COALESCE((p_payload->>'created_at')::TIMESTAMPTZ, NOW());

    -- C. SMART CUSTOMER RESOLUTION (Upsert Logic)
    v_input_customer_id := p_payload->'customer'->>'id';
    
    -- Case 1: ID provided and is valid UUID
    IF v_input_customer_id IS NOT NULL AND v_input_customer_id ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN
         v_customer_id := v_input_customer_id::UUID;
    ELSE
        -- Case 2: No valid ID (Offline/New Customer) -> Lookup by Phone
        SELECT id INTO v_customer_id 
        FROM customers 
        WHERE phone = (p_payload->'customer'->>'phone') 
        LIMIT 1;
        
        -- Case 3: Still null? CREATE NEW CUSTOMER
        IF v_customer_id IS NULL THEN
            INSERT INTO customers (name, phone, address, created_at)
            VALUES (
                COALESCE(p_payload->'customer'->>'name', 'Guest'),
                COALESCE(p_payload->'customer'->>'phone', '-'),
                '-', -- Default Address
                v_created_at
            ) RETURNING id INTO v_customer_id;
        END IF;
    END IF;


    -- 3. GENERATE ORDER NUMBER (Server Authority)
    -- Format: ORD-YYYYMMDD-HHMISS-XXXX (Using v_created_at to match timeline)
    v_order_number := 'ORD-' || to_char(v_created_at, 'YYYYMMDD-HH24MISS') || '-' || substring(md5(random()::text) from 1 for 4);

    -- 4. DETERMINE FINANCIALS (AUTHORITY MODEL)
    v_total_amount := COALESCE((p_payload->>'total_amount')::NUMERIC, -1);
    v_paid_amount := COALESCE((p_payload->'payment'->>'amount')::NUMERIC, 0);
    v_discount_amount := COALESCE((p_payload->>'discount_amount')::NUMERIC, 0);
    v_remaining_amount := COALESCE((p_payload->>'remaining_amount')::NUMERIC, 0);
    v_payment_status := COALESCE(p_payload->>'payment_status', 'UNPAID');
    v_production_status := COALESCE(p_payload->>'production_status', 'PENDING');
    v_is_tempo := COALESCE((p_payload->>'is_tempo')::BOOLEAN, false);

    -- FALLBACK: Legacy Calculation (Same as original)
    IF v_total_amount < 0 THEN
        v_remaining_amount := 0; 
        FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
        LOOP
            v_item_subtotal := COALESCE((v_item->>'subtotal')::NUMERIC, (v_item->>'price')::NUMERIC * (v_item->>'quantity')::NUMERIC);
            v_calculated_total := v_calculated_total + v_item_subtotal;
        END LOOP;
        v_total_amount := v_calculated_total - v_discount_amount;
        v_remaining_amount := v_total_amount - v_paid_amount;
        IF v_remaining_amount <= 0 THEN v_payment_status := 'PAID';
        ELSEIF v_paid_amount > 0 THEN v_payment_status := 'PARTIAL';
        ELSE v_payment_status := 'UNPAID';
        END IF;
    END IF;

    -- VALIDATION
    IF v_total_amount < 0 THEN v_total_amount := 0; END IF;

    -- 5. INSERT ORDER
    INSERT INTO orders (
        order_number, customer_id, customer_name, customer_phone,
        total_amount, discount_amount, paid_amount, remaining_amount,
        payment_status, payment_method, production_status, is_tempo,
        received_by, meta, 
        created_at, updated_at,
        ref_local_id, local_created_at -- New Columns
    ) VALUES (
        v_order_number, v_customer_id,
        p_payload->'customer'->>'name', p_payload->'customer'->>'phone',
        v_total_amount, v_discount_amount, v_paid_amount, v_remaining_amount,
        v_payment_status, p_payload->'payment'->>'method',
        v_production_status, v_is_tempo,
        p_payload->'payment'->>'received_by', v_meta,
        v_created_at, NOW(), -- Use v_created_at for created_at
        v_local_ref, (p_payload->>'local_created_at')::TIMESTAMPTZ -- Map new columns
    ) RETURNING id INTO v_order_id;

    -- 6. INSERT ITEMS (SMART MERGE & POLYMORPHIC) - Preserved Exact Logic
    INSERT INTO order_items (
        order_id, product_id, product_name, quantity, price, subtotal,
        dimensions
    )
    SELECT 
        v_order_id,
        (item->>'product_id'),
        (item->>'product_name'),
        (item->>'quantity')::NUMERIC,
        (item->>'unit_price')::NUMERIC,
        (item->>'subtotal')::NUMERIC,
        COALESCE(item->'specs', item->'dimensions', '{}'::jsonb) 
        || jsonb_build_object('note', item->>'notes')
    FROM jsonb_array_elements(v_items) AS item;

    -- 7. INSERT PAYMENT RECORD
    IF v_paid_amount > 0 THEN
        INSERT INTO order_payments (
            order_id, amount, payment_method, received_by, created_at
        ) VALUES (
            v_order_id, v_paid_amount,
            p_payload->'payment'->>'method',
            p_payload->'payment'->>'received_by',
            v_created_at -- Match order time
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'order_number', v_order_number,
        'total_amount', v_total_amount,
        'status', v_payment_status
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$;
