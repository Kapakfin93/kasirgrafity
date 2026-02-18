-- 1. Add Columns (Safe Add)
ALTER TABLE "public"."orders" ADD COLUMN IF NOT EXISTS "is_archived" BOOLEAN DEFAULT FALSE;
ALTER TABLE "public"."orders" ADD COLUMN IF NOT EXISTS "shop_id" UUID;

-- 2. Populate Defaults (Safe Update)
-- Ensure no nulls in boolean flag
UPDATE "public"."orders" SET "is_archived" = FALSE WHERE "is_archived" IS NULL;

-- 3. Create Index (Final Optimized Composite Index)
-- Order: shop_id (Cardinality) -> created_at (Range) -> Flags -> Status
DROP INDEX IF EXISTS "idx_orders_aggregator";
CREATE INDEX IF NOT EXISTS "idx_orders_aggregator" 
ON "public"."orders" ("shop_id", "created_at", "is_archived", "payment_status", "production_status");
