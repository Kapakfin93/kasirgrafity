-- ============================================================================
-- OWNER DASHBOARD VALIDATION QUERIES
-- Purpose: Verify data integrity after running ownerDashboardSeeder.js
-- ============================================================================

-- ============================================================================
-- 1. DATA INTEGRITY CHECKS (CRITICAL)
-- ============================================================================

-- 1.1 Check if paid_amount matches sum of order_payments
-- Expected: 0 rows (all should match)
SELECT 
  o.order_number,
  o.paid_amount AS order_paid,
  COALESCE(SUM(op.amount), 0) AS payments_sum,
  o.paid_amount - COALESCE(SUM(op.amount), 0) AS difference
FROM orders o
LEFT JOIN order_payments op ON o.id = op.order_id
WHERE o.idempotency_key LIKE 'SEED-%'
GROUP BY o.id, o.order_number, o.paid_amount
HAVING ABS(o.paid_amount - COALESCE(SUM(op.amount), 0)) > 1
ORDER BY ABS(o.paid_amount - COALESCE(SUM(op.amount), 0)) DESC;

-- 1.2 Check if remaining_amount is correct
-- Expected: 0 rows (all should match)
SELECT 
  order_number,
  total_amount,
  paid_amount,
  remaining_amount,
  (total_amount - paid_amount) AS calculated_remaining,
  remaining_amount - (total_amount - paid_amount) AS difference
FROM orders
WHERE idempotency_key LIKE 'SEED-%'
  AND ABS(remaining_amount - (total_amount - paid_amount)) > 1
ORDER BY ABS(remaining_amount - (total_amount - paid_amount)) DESC;

-- 1.3 Check for negative values
-- Expected: 0 rows (no negative amounts)
SELECT 
  order_number,
  total_amount,
  paid_amount,
  remaining_amount,
  discount_amount
FROM orders
WHERE idempotency_key LIKE 'SEED-%'
  AND (total_amount < 0 OR paid_amount < 0 OR remaining_amount < 0 OR discount_amount < 0);

-- 1.4 Check payment_status consistency
-- Expected: 0 rows (status should match amounts)
SELECT 
  order_number,
  payment_status,
  total_amount,
  paid_amount,
  remaining_amount
FROM orders
WHERE idempotency_key LIKE 'SEED-%'
  AND (
    (payment_status = 'PAID' AND remaining_amount > 0.5)
    OR (payment_status = 'UNPAID' AND paid_amount > 0)
    OR (payment_status = 'PARTIAL' AND (paid_amount = 0 OR remaining_amount <= 0))
  );

-- 1.5 Check for orphaned order_items
-- Expected: 0 rows
SELECT oi.* 
FROM order_items oi
LEFT JOIN orders o ON oi.order_id = o.id
WHERE o.id IS NULL
LIMIT 10;

-- 1.6 Check for orphaned order_payments
-- Expected: 0 rows
SELECT op.* 
FROM order_payments op
LEFT JOIN orders o ON op.order_id = o.id
WHERE o.id IS NULL
LIMIT 10;

-- 1.7 Check for duplicate order_numbers
-- Expected: 0 rows
SELECT order_number, COUNT(*) as count
FROM orders
WHERE idempotency_key LIKE 'SEED-%'
GROUP BY order_number
HAVING COUNT(*) > 1;

-- 1.8 Check discount cap (should not exceed total_amount)
-- Expected: 0 rows
SELECT 
  order_number,
  total_amount,
  discount_amount,
  discount_amount - total_amount AS excess
FROM orders
WHERE idempotency_key LIKE 'SEED-%'
  AND discount_amount > total_amount;

-- ============================================================================
-- 2. DASHBOARD METRICS VERIFICATION
-- ============================================================================

-- 2.1 Total Penjualan (Today)
-- Compare with Dashboard "💰 Total Penjualan" card
SELECT 
  COUNT(*) AS order_count,
  SUM(total_amount) AS total_sales,
  AVG(total_amount) AS avg_order_value
FROM orders
WHERE DATE(created_at) = CURRENT_DATE
  AND idempotency_key LIKE 'SEED-%';

-- 2.2 Uang Masuk (Today)
-- Compare with Dashboard "💵 Uang Masuk" card
SELECT 
  COUNT(*) AS payment_count,
  SUM(amount) AS total_collected
FROM order_payments
WHERE DATE(created_at) = CURRENT_DATE
  AND order_id IN (SELECT id FROM orders WHERE idempotency_key LIKE 'SEED-%');

-- 2.3 Total Tagihan (All Time)
-- Compare with Dashboard "⚠️ Total Tagihan" card
SELECT 
  COUNT(*) AS unpaid_order_count,
  SUM(remaining_amount) AS total_outstanding
FROM orders
WHERE payment_status IN ('PARTIAL', 'UNPAID')
  AND idempotency_key LIKE 'SEED-%';

-- 2.4 Total Diskon (Today)
-- Compare with Dashboard "🎟️ Total Diskon" card
SELECT 
  COUNT(*) AS orders_with_discount,
  SUM(discount_amount) AS total_discount
FROM orders
WHERE DATE(created_at) = CURRENT_DATE
  AND idempotency_key LIKE 'SEED-%'
  AND discount_amount > 0;

-- 2.5 Cashflow Bersih (Today)
-- Compare with Dashboard "🔥 CASHFLOW BERSIH" (center header)
-- Note: Pengeluaran = 0 (no expense seeder)
SELECT 
  SUM(op.amount) AS uang_masuk,
  0 AS pengeluaran,
  SUM(op.amount) - 0 AS cashflow_bersih
FROM order_payments op
WHERE DATE(op.created_at) = CURRENT_DATE
  AND op.order_id IN (SELECT id FROM orders WHERE idempotency_key LIKE 'SEED-%');

-- ============================================================================
-- 3. ORDER COUNT BREAKDOWN
-- ============================================================================

-- 3.1 Production Status Breakdown (All Time)
-- Compare with Dashboard cards: "⏳ Pesanan Pending", "✅ Siap Diambil"
SELECT 
  production_status,
  COUNT(*) AS count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM orders
WHERE idempotency_key LIKE 'SEED-%'
GROUP BY production_status
ORDER BY 
  CASE production_status
    WHEN 'PENDING' THEN 1
    WHEN 'IN_PROGRESS' THEN 2
    WHEN 'READY' THEN 3
    WHEN 'DELIVERED' THEN 4
  END;

-- 3.2 Payment Status Breakdown (All Time)
-- Compare with Dashboard: "🔴 Belum Bayar", "🟡 DP (Cicilan)", "🟢 Lunas"
SELECT 
  payment_status,
  COUNT(*) AS count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage,
  SUM(total_amount) AS total_value,
  SUM(remaining_amount) AS total_remaining
FROM orders
WHERE idempotency_key LIKE 'SEED-%'
GROUP BY payment_status
ORDER BY 
  CASE payment_status
    WHEN 'UNPAID' THEN 1
    WHEN 'PARTIAL' THEN 2
    WHEN 'PAID' THEN 3
  END;

-- ============================================================================
-- 4. DP & PELUNASAN VALIDATION
-- ============================================================================

-- 4.1 Check DP ratio (should be 30-50% of total)
-- Expected: All rows should have dp_percent between 20-60%
SELECT 
  o.order_number,
  o.total_amount,
  op.amount AS dp_amount,
  ROUND((op.amount * 100.0 / o.total_amount), 2) AS dp_percent
FROM orders o
JOIN order_payments op ON o.id = op.order_id
WHERE o.idempotency_key LIKE 'SEED-%'
  AND o.payment_status = 'PARTIAL'
  AND op.created_at = (
    SELECT MIN(created_at) 
    FROM order_payments 
    WHERE order_id = o.id
  )
ORDER BY dp_percent DESC
LIMIT 20;

-- 4.2 Check pelunasan timing (should be 1-3 days after DP)
-- Expected: All rows should have days_between 1-7
SELECT 
  o.order_number,
  MIN(op.created_at) AS dp_date,
  MAX(op.created_at) AS pelunasan_date,
  EXTRACT(DAY FROM (MAX(op.created_at) - MIN(op.created_at))) AS days_between
FROM orders o
JOIN order_payments op ON o.id = op.order_id
WHERE o.idempotency_key LIKE 'SEED-%'
GROUP BY o.id, o.order_number
HAVING COUNT(op.id) > 1
ORDER BY days_between DESC
LIMIT 20;

-- 4.3 Check for orders with multiple payments
SELECT 
  o.order_number,
  o.payment_status,
  COUNT(op.id) AS payment_count,
  ARRAY_AGG(op.amount ORDER BY op.created_at) AS payment_amounts,
  ARRAY_AGG(op.payment_method ORDER BY op.created_at) AS payment_methods
FROM orders o
LEFT JOIN order_payments op ON o.id = op.order_id
WHERE o.idempotency_key LIKE 'SEED-%'
GROUP BY o.id, o.order_number, o.payment_status
HAVING COUNT(op.id) > 1
ORDER BY payment_count DESC
LIMIT 20;

-- ============================================================================
-- 5. SUMMARY STATISTICS
-- ============================================================================

-- 5.1 Overall Seeder Summary
SELECT 
  COUNT(*) AS total_orders,
  COUNT(DISTINCT DATE(created_at)) AS days_covered,
  MIN(created_at) AS earliest_order,
  MAX(created_at) AS latest_order,
  SUM(total_amount) AS total_revenue,
  SUM(discount_amount) AS total_discount,
  SUM(paid_amount) AS total_collected,
  SUM(remaining_amount) AS total_outstanding,
  ROUND(AVG(total_amount), 2) AS avg_order_value
FROM orders
WHERE idempotency_key LIKE 'SEED-%';

-- 5.2 Daily Order Distribution
SELECT 
  DATE(created_at) AS order_date,
  COUNT(*) AS order_count,
  SUM(total_amount) AS daily_revenue,
  SUM(paid_amount) AS daily_collected
FROM orders
WHERE idempotency_key LIKE 'SEED-%'
GROUP BY DATE(created_at)
ORDER BY order_date DESC
LIMIT 30;

-- 5.3 Product Distribution
SELECT 
  oi.product_name,
  COUNT(DISTINCT oi.order_id) AS order_count,
  SUM(oi.quantity) AS total_quantity,
  SUM(oi.subtotal) AS total_revenue
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
WHERE o.idempotency_key LIKE 'SEED-%'
GROUP BY oi.product_name
ORDER BY order_count DESC;

-- 5.4 Payment Method Distribution
SELECT 
  payment_method,
  COUNT(*) AS payment_count,
  SUM(amount) AS total_amount,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage
FROM order_payments
WHERE order_id IN (SELECT id FROM orders WHERE idempotency_key LIKE 'SEED-%')
GROUP BY payment_method
ORDER BY payment_count DESC;

-- ============================================================================
-- 6. EXPECTED RANGES (For Pass/Fail Validation)
-- ============================================================================

-- 6.1 Expected Order Count: ~600 (tolerance: ±10)
-- PASS if: 590 <= total_orders <= 610
SELECT 
  COUNT(*) AS total_orders,
  CASE 
    WHEN COUNT(*) BETWEEN 590 AND 610 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END AS validation_status
FROM orders
WHERE idempotency_key LIKE 'SEED-%';

-- 6.2 Expected PAID ratio: ~60% (tolerance: ±5%)
-- PASS if: 55% <= paid_ratio <= 65%
SELECT 
  payment_status,
  COUNT(*) AS count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) AS percentage,
  CASE 
    WHEN payment_status = 'PAID' AND COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () BETWEEN 55 AND 65 THEN '✅ PASS'
    WHEN payment_status = 'PARTIAL' AND COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () BETWEEN 25 AND 35 THEN '✅ PASS'
    WHEN payment_status = 'UNPAID' AND COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () BETWEEN 5 AND 15 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END AS validation_status
FROM orders
WHERE idempotency_key LIKE 'SEED-%'
GROUP BY payment_status;

-- 6.3 Expected Discount frequency: ~15% (tolerance: ±5%)
-- PASS if: 10% <= discount_ratio <= 20%
SELECT 
  COUNT(CASE WHEN discount_amount > 0 THEN 1 END) AS orders_with_discount,
  COUNT(*) AS total_orders,
  ROUND(COUNT(CASE WHEN discount_amount > 0 THEN 1 END) * 100.0 / COUNT(*), 2) AS discount_percentage,
  CASE 
    WHEN COUNT(CASE WHEN discount_amount > 0 THEN 1 END) * 100.0 / COUNT(*) BETWEEN 10 AND 20 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END AS validation_status
FROM orders
WHERE idempotency_key LIKE 'SEED-%';

-- ============================================================================
-- 7. CLEANUP QUERY (Use with caution!)
-- ============================================================================

-- 7.1 Delete all seeder data (DANGEROUS - Run only if you want to reset)
-- Uncomment to use:
/*
DELETE FROM order_payments 
WHERE order_id IN (SELECT id FROM orders WHERE idempotency_key LIKE 'SEED-%');

DELETE FROM order_items 
WHERE order_id IN (SELECT id FROM orders WHERE idempotency_key LIKE 'SEED-%');

DELETE FROM orders 
WHERE idempotency_key LIKE 'SEED-%';
*/

-- ============================================================================
-- END OF VALIDATION QUERIES
-- ============================================================================
