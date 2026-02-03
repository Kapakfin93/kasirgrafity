-- ============================================
-- create_pos_order_atomic
-- Authoritative Atomic Transaction RPC
-- Version: 1.0.1
-- Date: 2026-02-04
-- PATCHES: search_path, idempotency return, order_number sequence
-- ============================================
-- FEATURES:
-- 1. RAW_INTENT only (no client-side prices/status)
-- 2. Server-side price calculation from DB
-- 3. Atomic transaction (all-or-nothing)
-- 4. Idempotency enforcement
-- ============================================

-- PATCH 2: Create sequence for collision-safe order numbers
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

-- PATCH 2: Ensure order_number uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_number_unique ON orders(order_number);

CREATE OR REPLACE FUNCTION create_pos_order_atomic(p_raw_intent JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_idempotency_key TEXT;
  v_existing_order RECORD;
  v_item JSONB;
  v_product RECORD;
  v_unit_price NUMERIC;
  v_item_subtotal NUMERIC;
  v_item_finishing_cost NUMERIC;
  v_items_total NUMERIC := 0;
  v_service_fee NUMERIC := 0;
  v_discount NUMERIC := 0;
  v_grand_total NUMERIC;
  v_paid NUMERIC;
  v_remaining NUMERIC;
  v_payment_status TEXT;
  v_order_id UUID;
  v_order_number TEXT;
  v_item_records JSONB := '[]'::JSONB;
  v_finishing_id TEXT;
  v_finishing_price NUMERIC;
  v_qty INTEGER;
BEGIN
  -- PATCH 3: SECURITY DEFINER SAFETY
  SET search_path = public;

  -- ============================================
  -- STEP 1: IDEMPOTENCY CHECK (FIRST!)
  -- ============================================
  v_idempotency_key := p_raw_intent->>'idempotency_key';
  
  IF v_idempotency_key IS NULL OR v_idempotency_key = '' THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'IDEMPOTENCY_KEY_REQUIRED',
      'message', 'Client must provide idempotency_key'
    );
  END IF;
  
  -- Check for existing order with same key
  -- PATCH 1: Fetch all fields needed for consistent return
  SELECT id, order_number, payment_status, total_amount, paid_amount, remaining_amount
  INTO v_existing_order 
  FROM orders 
  WHERE idempotency_key = v_idempotency_key 
  LIMIT 1;
  
  IF FOUND THEN
    -- Return existing order (NO new insert)
    -- PATCH 1: Return with consistent field names matching success response
    RETURN jsonb_build_object(
      'success', true,
      'order_id', v_existing_order.id,
      'order_number', v_existing_order.order_number,
      'payment_status', v_existing_order.payment_status,
      'calculated_total', v_existing_order.total_amount,
      'paid_amount', v_existing_order.paid_amount,
      'remaining_amount', v_existing_order.remaining_amount,
      'is_duplicate', true,
      'message', 'Order already exists with this idempotency_key'
    );
  END IF;

  -- ============================================
  -- STEP 2: VALIDATE CUSTOMER
  -- ============================================
  IF (p_raw_intent->'customer'->>'name') IS NULL OR 
     TRIM(p_raw_intent->'customer'->>'name') = '' THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'CUSTOMER_NAME_REQUIRED',
      'message', 'customer.name is required'
    );
  END IF;

  -- ============================================
  -- STEP 3: VALIDATE ITEMS EXIST
  -- ============================================
  IF p_raw_intent->'items' IS NULL OR 
     jsonb_array_length(p_raw_intent->'items') = 0 THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'ITEMS_REQUIRED',
      'message', 'At least one item is required'
    );
  END IF;

  -- ============================================
  -- STEP 4: FETCH PRICES & CALCULATE TOTALS
  -- ============================================
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_raw_intent->'items')
  LOOP
    v_unit_price := NULL;
    v_item_finishing_cost := 0;
    v_qty := COALESCE((v_item->>'quantity')::INTEGER, 1);
    
    -- A. Try MATRIX price first (product + material + size)
    IF v_item->>'material_id' IS NOT NULL AND v_item->>'size_id' IS NOT NULL THEN
      SELECT price INTO v_unit_price
      FROM product_price_matrix
      WHERE product_id = v_item->>'product_id'
        AND material_id = v_item->>'material_id'
        AND size_id = v_item->>'size_id'
      LIMIT 1;
    END IF;
    
    -- B. Fallback to products.base_price
    IF v_unit_price IS NULL THEN
      SELECT base_price, name INTO v_product
      FROM products 
      WHERE id = v_item->>'product_id';
      
      IF NOT FOUND THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'PRODUCT_NOT_FOUND',
          'product_id', v_item->>'product_id',
          'message', 'Product not found in database'
        );
      END IF;
      
      v_unit_price := COALESCE(v_product.base_price, 0);
    ELSE
      -- Get product name for record
      SELECT name INTO v_product FROM products WHERE id = v_item->>'product_id';
    END IF;
    
    -- C. REJECT if price is 0 or negative
    IF v_unit_price <= 0 THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'INVALID_PRICE',
        'product_id', v_item->>'product_id',
        'message', 'Price must be greater than 0'
      );
    END IF;
    
    -- D. Calculate item subtotal (unit_price × quantity)
    v_item_subtotal := v_unit_price * v_qty;
    
    -- E. Calculate finishing costs (sum of finishing prices)
    IF v_item->'finishing_ids' IS NOT NULL AND 
       jsonb_array_length(v_item->'finishing_ids') > 0 THEN
      FOR v_finishing_id IN SELECT jsonb_array_elements_text(v_item->'finishing_ids')
      LOOP
        SELECT COALESCE(price, 0) INTO v_finishing_price
        FROM finishing_options
        WHERE finishing_id = v_finishing_id
        LIMIT 1;
        
        IF v_finishing_price IS NOT NULL THEN
          v_item_finishing_cost := v_item_finishing_cost + v_finishing_price;
        END IF;
      END LOOP;
    END IF;
    
    -- F. Add finishing cost per item
    v_item_subtotal := v_item_subtotal + (v_item_finishing_cost * v_qty);
    
    -- G. Accumulate to total
    v_items_total := v_items_total + v_item_subtotal;
    
    -- H. Store calculated item for later INSERT
    v_item_records := v_item_records || jsonb_build_object(
      'product_id', v_item->>'product_id',
      'product_name', COALESCE(v_product.name, 'Unknown'),
      'quantity', v_qty,
      'unit_price', v_unit_price,
      'subtotal', v_item_subtotal,
      'notes', COALESCE(v_item->>'notes', ''),
      'metadata', jsonb_build_object(
        'material_id', v_item->>'material_id',
        'size_id', v_item->>'size_id',
        'finishing_ids', v_item->'finishing_ids',
        'finishing_cost', v_item_finishing_cost
      )
    );
  END LOOP;

  -- ============================================
  -- STEP 5: APPLY SERVICE FEE (Priority)
  -- ============================================
  CASE COALESCE(p_raw_intent->'meta'->>'production_priority', 'STANDARD')
    WHEN 'EXPRESS' THEN v_service_fee := 15000;
    WHEN 'URGENT' THEN v_service_fee := 30000;
    ELSE v_service_fee := 0;
  END CASE;

  -- ============================================
  -- STEP 6: APPLY DISCOUNT
  -- ============================================
  v_discount := LEAST(
    COALESCE((p_raw_intent->'meta'->>'discount_request')::NUMERIC, 0),
    v_items_total  -- Cannot exceed item total
  );
  
  -- Ensure discount is not negative
  IF v_discount < 0 THEN
    v_discount := 0;
  END IF;

  -- ============================================
  -- STEP 7: CALCULATE GRAND TOTAL
  -- ============================================
  v_grand_total := v_items_total + v_service_fee - v_discount;
  
  IF v_grand_total <= 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_TOTAL',
      'message', 'Grand total must be greater than 0',
      'calculated', jsonb_build_object(
        'items_total', v_items_total,
        'service_fee', v_service_fee,
        'discount', v_discount
      )
    );
  END IF;

  -- ============================================
  -- STEP 8: DETERMINE PAYMENT STATUS (SERVER-SIDE)
  -- ============================================
  v_paid := COALESCE((p_raw_intent->'payment_attempt'->>'amount')::NUMERIC, 0);
  
  IF v_paid < 0 THEN
    v_paid := 0;
  END IF;
  
  v_remaining := v_grand_total - v_paid;
  
  IF v_remaining <= 0.5 THEN
    -- Tolerance for floating point
    v_payment_status := 'PAID';
    v_remaining := 0;
  ELSIF v_paid > 0 THEN
    v_payment_status := 'PARTIAL';
  ELSE
    v_payment_status := 'UNPAID';
  END IF;

  -- ============================================
  -- STEP 9: ATOMIC INSERT - ORDERS
  -- ============================================
  INSERT INTO orders (
    idempotency_key,
    order_number,
    customer_name,
    customer_phone,
    customer_address,
    total_amount,
    discount_amount,
    paid_amount,
    remaining_amount,
    payment_status,
    payment_method,
    received_by,
    target_date,
    production_status,
    source,
    meta,
    items_snapshot,
    created_at
  ) VALUES (
    v_idempotency_key,
    -- PATCH 2: Sequence-based order number (collision-safe)
    'ORD-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || LPAD(nextval('order_number_seq')::TEXT, 6, '0'),
    TRIM(p_raw_intent->'customer'->>'name'),
    COALESCE(p_raw_intent->'customer'->>'phone', '-'),
    COALESCE(p_raw_intent->'customer'->>'address', '-'),
    v_grand_total,
    v_discount,
    v_paid,
    v_remaining,
    v_payment_status,
    COALESCE(p_raw_intent->'payment_attempt'->>'method', 'TUNAI'),
    COALESCE(p_raw_intent->'meta'->>'received_by', 'System'),
    (p_raw_intent->'meta'->>'target_date')::TIMESTAMPTZ,
    'PENDING',
    'POS_ATOMIC',
    jsonb_build_object(
      'production_priority', COALESCE(p_raw_intent->'meta'->>'production_priority', 'STANDARD'),
      'service_fee', v_service_fee,
      'source_version', 'create_pos_order_atomic_v1'
    ),
    v_item_records,
    NOW()
  ) RETURNING id, order_number INTO v_order_id, v_order_number;

  -- ============================================
  -- STEP 10: ATOMIC INSERT - ORDER_ITEMS
  -- ============================================
  INSERT INTO order_items (
    order_id, 
    product_id, 
    product_name, 
    quantity, 
    price, 
    subtotal, 
    notes,
    metadata
  )
  SELECT 
    v_order_id,
    (item->>'product_id'),
    (item->>'product_name'),
    (item->>'quantity')::INTEGER,
    (item->>'unit_price')::NUMERIC,
    (item->>'subtotal')::NUMERIC,
    (item->>'notes'),
    (item->'metadata')
  FROM jsonb_array_elements(v_item_records) AS item;

  -- ============================================
  -- STEP 11: ATOMIC INSERT - ORDER_PAYMENTS
  -- ============================================
  IF v_paid > 0 THEN
    INSERT INTO order_payments (
      order_id, 
      amount, 
      payment_method, 
      received_by,
      created_at
    )
    VALUES (
      v_order_id,
      v_paid,
      COALESCE(p_raw_intent->'payment_attempt'->>'method', 'TUNAI'),
      COALESCE(p_raw_intent->'meta'->>'received_by', 'System'),
      NOW()
    );
  END IF;

  -- ============================================
  -- STEP 12: RETURN SUCCESS
  -- ============================================
  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'payment_status', v_payment_status,
    'calculated_total', v_grand_total,
    'items_total', v_items_total,
    'service_fee', v_service_fee,
    'discount', v_discount,
    'paid_amount', v_paid,
    'remaining_amount', v_remaining,
    'is_duplicate', false
  );

-- ============================================
-- EXCEPTION HANDLER: FULL ROLLBACK
-- ============================================
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'TRANSACTION_FAILED',
    'message', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$;

-- ============================================
-- GRANT EXECUTE TO AUTHENTICATED USERS
-- ============================================
GRANT EXECUTE ON FUNCTION create_pos_order_atomic(JSONB) TO authenticated;

-- ============================================
-- COMMENT FOR DOCUMENTATION
-- ============================================
COMMENT ON FUNCTION create_pos_order_atomic(JSONB) IS 
'Authoritative Atomic Transaction for POS Order Creation.
- Receives RAW_INTENT only (no client-side calculated values)
- Fetches prices from product_price_matrix or products.base_price
- Calculates totals, payment status server-side
- Enforces idempotency via orders.idempotency_key
- Atomic: orders + order_items + order_payments in single transaction
- Any error triggers full rollback';
