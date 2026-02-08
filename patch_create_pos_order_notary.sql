-- =============================================
-- LANGKAH 1: HAPUS DULU BIAR GAK BENTROK
-- =============================================
DROP FUNCTION IF EXISTS create_pos_order_notary(jsonb);

-- =============================================
-- LANGKAH 2: PATCH FINAL (SMART MERGE NOTES)
-- =============================================
CREATE OR REPLACE FUNCTION create_pos_order_notary(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_customer_id UUID;
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
BEGIN
    -- 1. EXTRACT PAYLOAD
    v_items := p_payload->'items';
    v_meta := p_payload->'meta';
    
    -- 2. RESOLVE CUSTOMER
    v_customer_id := (p_payload->'customer'->>'id')::UUID;

    -- 3. GENERATE ORDER NUMBER
    v_order_number := 'ORD-' || to_char(now(), 'YYYYMMDD-HH24MISS') || '-' || substring(md5(random()::text) from 1 for 4);

    -- 4. DETERMINE FINANCIALS (AUTHORITY MODEL)
    v_total_amount := COALESCE((p_payload->>'total_amount')::NUMERIC, -1);
    v_paid_amount := COALESCE((p_payload->'payment'->>'amount')::NUMERIC, 0);
    v_discount_amount := COALESCE((p_payload->>'discount_amount')::NUMERIC, 0);
    v_remaining_amount := COALESCE((p_payload->>'remaining_amount')::NUMERIC, 0);
    v_payment_status := COALESCE(p_payload->>'payment_status', 'UNPAID');
    v_production_status := COALESCE(p_payload->>'production_status', 'PENDING');
    v_is_tempo := COALESCE((p_payload->>'is_tempo')::BOOLEAN, false);

    -- FALLBACK: Legacy Calculation
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
        received_by, meta, created_at, updated_at
    ) VALUES (
        v_order_number, v_customer_id,
        p_payload->'customer'->>'name', p_payload->'customer'->>'phone',
        v_total_amount, v_discount_amount, v_paid_amount, v_remaining_amount,
        v_payment_status, p_payload->'payment'->>'method',
        v_production_status, v_is_tempo,
        p_payload->'payment'->>'received_by', v_meta,
        NOW(), NOW()
    ) RETURNING id INTO v_order_id;

    -- 6. INSERT ITEMS (SMART MERGE & POLYMORPHIC)
    -- 🔥 PERHATIKAN: Kita tidak insert ke kolom 'note' (karena tidak ada),
    -- tapi kita GABUNGKAN note ke dalam kolom 'dimensions' (JSONB).
    INSERT INTO order_items (
        order_id, product_id, product_name, quantity, price, subtotal,
        dimensions -- Kolom JSONB Serbaguna
    )
    SELECT 
        v_order_id,
        (item->>'product_id'),
        (item->>'product_name'),
        (item->>'quantity')::NUMERIC,
        (item->>'unit_price')::NUMERIC,
        (item->>'subtotal')::NUMERIC,
        
        -- 🔥 LOGIKA CANGGIH CTO:
        -- 1. Ambil specs atau dimensions (Fallback)
        -- 2. GABUNGKAN (||) dengan object baru berisi 'note'
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
            NOW()
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