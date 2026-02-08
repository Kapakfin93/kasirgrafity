CREATE OR REPLACE FUNCTION create_pos_order_notary(p_payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_order_number TEXT;
  v_items_total NUMERIC := 0;
  v_service_fee NUMERIC := 0;
  v_discount NUMERIC := 0;
  v_grand_total NUMERIC := 0;
  v_paid NUMERIC := 0;
  v_remaining NUMERIC := 0;
  v_payment_status TEXT;
  v_item JSONB;
BEGIN
  SET search_path = public;

  -- 1. IDEMPOTENCY
  IF p_payload->>'idempotency_key' IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'IDEMPOTENCY_REQUIRED');
  END IF;

  IF EXISTS (
    SELECT 1 FROM orders
    WHERE idempotency_key = p_payload->>'idempotency_key'
  ) THEN
    RETURN jsonb_build_object(
      'success', true,
      'duplicate', true
    );
  END IF;

  -- 2. ITEMS TOTAL
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_payload->'items')
  LOOP
    IF (v_item->>'subtotal') IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'ITEM_SUBTOTAL_REQUIRED');
    END IF;

    v_items_total := v_items_total + (v_item->>'subtotal')::NUMERIC;
  END LOOP;

  -- 3. SERVICE FEE
  CASE COALESCE(p_payload->'meta'->>'production_priority', 'STANDARD')
    WHEN 'EXPRESS' THEN v_service_fee := 15000;
    WHEN 'URGENT' THEN v_service_fee := 30000;
    ELSE v_service_fee := 0;
  END CASE;

  v_grand_total := v_items_total + v_service_fee;

  -- 4. PAYMENT
  v_paid := COALESCE((p_payload->'payment'->>'amount')::NUMERIC, 0);
  v_remaining := v_grand_total - v_paid;

  IF v_remaining <= 0 THEN
    v_payment_status := 'PAID';
    v_remaining := 0;
  ELSIF v_paid > 0 THEN
    v_payment_status := 'PARTIAL';
  ELSE
    v_payment_status := 'UNPAID';
  END IF;

  -- 5. INSERT ORDER
  INSERT INTO orders (
    idempotency_key,
    order_number,
    customer_name,
    customer_phone,
    total_amount,
    paid_amount,
    remaining_amount,
    payment_status,
    source,
    meta,
    created_at
  ) VALUES (
    p_payload->>'idempotency_key',
    'ORD-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || LPAD(nextval('order_number_seq')::TEXT, 6, '0'),
    p_payload->'customer'->>'name',
    p_payload->'customer'->>'phone',
    v_grand_total,
    v_paid,
    v_remaining,
    v_payment_status,
    'POS_NOTARY',
    p_payload->'meta',
    NOW()
  ) RETURNING id, order_number INTO v_order_id, v_order_number;

  -- 6. INSERT ITEMS
  INSERT INTO order_items (
    order_id,
    product_id,
    product_name,
    quantity,
    unit_price,
    subtotal,
    metadata
  )
  SELECT
    v_order_id,
    item->>'product_id',
    item->>'product_name',
    (item->>'quantity')::INTEGER,
    (item->>'unit_price')::NUMERIC,
    (item->>'subtotal')::NUMERIC,
    jsonb_build_object(
      'specs', item->'specs',
      'notes', item->>'notes'
    )
  FROM jsonb_array_elements(p_payload->'items') AS item;

  -- 7. INSERT PAYMENT
  IF v_paid > 0 THEN
    INSERT INTO order_payments (
      order_id,
      amount,
      payment_method,
      created_at
    ) VALUES (
      v_order_id,
      v_paid,
      p_payload->'payment'->>'method',
      NOW()
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'total', v_grand_total,
    'payment_status', v_payment_status
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;
