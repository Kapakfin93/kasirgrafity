-- ============================================================================
-- MASTER DATA AUDIT - PRODUCT PRICING VALIDATION
-- Purpose: Identify products that are VALID for seeder simulation
-- Date: 2026-02-04
-- ============================================================================

-- ============================================================================
-- 1. FULL PRODUCT PRICING OVERVIEW
-- Shows ALL active products with their pricing sources
-- ============================================================================

SELECT 
  p.id AS product_id,
  p.name,
  p.category_id,
  p.calc_engine,
  p.input_mode,
  p.base_price,
  COALESCE(m.matrix_count, 0) AS matrix_entry_count,
  CASE 
    WHEN p.base_price > 0 AND COALESCE(m.matrix_count, 0) > 0 THEN 'HYBRID (base + matrix)'
    WHEN p.base_price > 0 THEN 'BASE_PRICE_ONLY'
    WHEN COALESCE(m.matrix_count, 0) > 0 THEN 'MATRIX_ONLY'
    ELSE 'NO_PRICING ❌'
  END AS pricing_source,
  CASE 
    WHEN p.base_price > 0 OR COALESCE(m.matrix_count, 0) > 0 THEN 'VALID ✅'
    ELSE 'INVALID ❌'
  END AS seeder_eligible
FROM products p
LEFT JOIN (
  SELECT product_id, COUNT(*) AS matrix_count
  FROM product_price_matrix
  WHERE price > 0
  GROUP BY product_id
) m ON p.id = m.product_id
WHERE p.is_active = true
ORDER BY 
  CASE WHEN p.base_price > 0 OR COALESCE(m.matrix_count, 0) > 0 THEN 0 ELSE 1 END,
  p.category_id,
  p.name;

-- ============================================================================
-- 2. INVALID PRODUCTS (base_price = 0 AND no matrix)
-- These will cause RPC failures
-- ============================================================================

SELECT 
  p.id AS product_id,
  p.name,
  p.category_id,
  p.calc_engine,
  p.base_price,
  COALESCE(m.matrix_count, 0) AS matrix_entry_count,
  'INVALID - No valid pricing' AS issue
FROM products p
LEFT JOIN (
  SELECT product_id, COUNT(*) AS matrix_count
  FROM product_price_matrix
  WHERE price > 0
  GROUP BY product_id
) m ON p.id = m.product_id
WHERE p.is_active = true
  AND p.base_price <= 0
  AND COALESCE(m.matrix_count, 0) = 0
ORDER BY p.category_id, p.name;

-- ============================================================================
-- 3. VALID PRODUCTS COUNT SUMMARY
-- Quick stats for seeder configuration
-- ============================================================================

SELECT 
  'VALID (seeder eligible)' AS category,
  COUNT(*) AS product_count
FROM products p
LEFT JOIN (
  SELECT product_id, COUNT(*) AS matrix_count
  FROM product_price_matrix
  WHERE price > 0
  GROUP BY product_id
) m ON p.id = m.product_id
WHERE p.is_active = true
  AND (p.base_price > 0 OR COALESCE(m.matrix_count, 0) > 0)

UNION ALL

SELECT 
  'INVALID (no pricing)' AS category,
  COUNT(*) AS product_count
FROM products p
LEFT JOIN (
  SELECT product_id, COUNT(*) AS matrix_count
  FROM product_price_matrix
  WHERE price > 0
  GROUP BY product_id
) m ON p.id = m.product_id
WHERE p.is_active = true
  AND p.base_price <= 0
  AND COALESCE(m.matrix_count, 0) = 0;

-- ============================================================================
-- 4. PRICING SOURCE BREAKDOWN BY CATEGORY
-- ============================================================================

SELECT 
  p.category_id,
  COUNT(*) AS total_products,
  COUNT(CASE WHEN p.base_price > 0 THEN 1 END) AS with_base_price,
  COUNT(CASE WHEN COALESCE(m.matrix_count, 0) > 0 THEN 1 END) AS with_matrix,
  COUNT(CASE WHEN p.base_price > 0 OR COALESCE(m.matrix_count, 0) > 0 THEN 1 END) AS valid_for_seeder,
  COUNT(CASE WHEN p.base_price <= 0 AND COALESCE(m.matrix_count, 0) = 0 THEN 1 END) AS invalid
FROM products p
LEFT JOIN (
  SELECT product_id, COUNT(*) AS matrix_count
  FROM product_price_matrix
  WHERE price > 0
  GROUP BY product_id
) m ON p.id = m.product_id
WHERE p.is_active = true
GROUP BY p.category_id
ORDER BY p.category_id;

-- ============================================================================
-- 5. MATRIX PRODUCTS DETAIL
-- Products that rely on matrix pricing
-- ============================================================================

SELECT 
  p.id AS product_id,
  p.name,
  p.category_id,
  p.calc_engine,
  p.base_price,
  m.matrix_count,
  m.min_price,
  m.max_price,
  m.avg_price
FROM products p
JOIN (
  SELECT 
    product_id, 
    COUNT(*) AS matrix_count,
    MIN(price) AS min_price,
    MAX(price) AS max_price,
    ROUND(AVG(price), 0) AS avg_price
  FROM product_price_matrix
  WHERE price > 0
  GROUP BY product_id
) m ON p.id = m.product_id
WHERE p.is_active = true
ORDER BY m.matrix_count DESC;

-- ============================================================================
-- 6. SAMPLE MATRIX ENTRIES (First 20)
-- Shows actual material_id and size_id combinations
-- ============================================================================

SELECT 
  ppm.product_id,
  p.name AS product_name,
  ppm.material_id,
  ppm.size_id,
  ppm.price
FROM product_price_matrix ppm
JOIN products p ON ppm.product_id = p.id
WHERE ppm.price > 0
  AND p.is_active = true
ORDER BY ppm.product_id, ppm.material_id, ppm.size_id
LIMIT 20;

-- ============================================================================
-- 7. PRODUCTS WITH BASE_PRICE ONLY (No matrix)
-- Safe fallback products for seeder
-- ============================================================================

SELECT 
  p.id AS product_id,
  p.name,
  p.category_id,
  p.calc_engine,
  p.base_price
FROM products p
LEFT JOIN (
  SELECT DISTINCT product_id
  FROM product_price_matrix
  WHERE price > 0
) m ON p.id = m.product_id
WHERE p.is_active = true
  AND p.base_price > 0
  AND m.product_id IS NULL
ORDER BY p.base_price DESC;

-- ============================================================================
-- END OF AUDIT
-- ============================================================================
