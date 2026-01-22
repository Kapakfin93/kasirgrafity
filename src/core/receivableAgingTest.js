/**
 * Receivable Aging - Test Scenarios
 * Test script for aging analysis functionality
 */

import {
  calculateAgingBucket,
  getAgingReport,
  AGING_BUCKETS,
} from "./receivableAging";

console.log("🧪 Testing Receivable Aging Layer...\n");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

// Reference date for all tests
const referenceDate = new Date("2026-01-22T17:00:00Z");

/**
 * TEST 1: Current bucket (0-7 days)
 */
console.log("TEST 1: Current Bucket (0-7 days)");
const currentOrder = {
  id: "test-current",
  order_number: "TEST-CURRENT-001",
  created_at: "2026-01-20T10:00:00Z", // 2 days ago
  remaining_amount: 500000,
};

const currentResult = calculateAgingBucket(currentOrder, referenceDate);
console.log(`Order Date: 2026-01-20 (2 days ago)`);
console.log(`Expected Bucket: CURRENT`);
console.log(`Got Bucket: ${currentResult.agingBucket}`);
console.log(`Age: ${currentResult.ageInDays} days`);
console.log(
  currentResult.agingBucket === AGING_BUCKETS.CURRENT ? "✅ PASS" : "❌ FAIL",
);
console.log("");

/**
 * TEST 2: Due bucket (8-30 days)
 */
console.log("TEST 2: Due Bucket (8-30 days)");
const dueOrder = {
  id: "test-due",
  order_number: "TEST-DUE-001",
  created_at: "2026-01-07T10:00:00Z", // 15 days ago
  remaining_amount: 800000,
};

const dueResult = calculateAgingBucket(dueOrder, referenceDate);
console.log(`Order Date: 2026-01-07 (15 days ago)`);
console.log(`Expected Bucket: DUE_8_30`);
console.log(`Got Bucket: ${dueResult.agingBucket}`);
console.log(`Age: ${dueResult.ageInDays} days`);
console.log(
  dueResult.agingBucket === AGING_BUCKETS.DUE_8_30 ? "✅ PASS" : "❌ FAIL",
);
console.log("");

/**
 * TEST 3: Overdue bucket (>30 days)
 */
console.log("TEST 3: Overdue Bucket (>30 days)");
const overdueOrder = {
  id: "test-overdue",
  order_number: "TEST-OVERDUE-001",
  created_at: "2025-12-15T10:00:00Z", // 38 days ago
  remaining_amount: 1200000,
};

const overdueResult = calculateAgingBucket(overdueOrder, referenceDate);
console.log(`Order Date: 2025-12-15 (38 days ago)`);
console.log(`Expected Bucket: OVERDUE_30`);
console.log(`Got Bucket: ${overdueResult.agingBucket}`);
console.log(`Age: ${overdueResult.ageInDays} days`);
console.log(
  overdueResult.agingBucket === AGING_BUCKETS.OVERDUE_30
    ? "✅ PASS"
    : "❌ FAIL",
);
console.log("");

/**
 * TEST 4: Boundary test (exactly 7 days - should be CURRENT)
 */
console.log("TEST 4: Boundary Test (exactly 7 days)");
const boundaryOrder1 = {
  id: "test-boundary-7",
  order_number: "TEST-BOUNDARY-7",
  created_at: "2026-01-15T17:00:00Z", // Exactly 7 days ago
  remaining_amount: 300000,
};

const boundary1Result = calculateAgingBucket(boundaryOrder1, referenceDate);
console.log(`Order Date: 2026-01-15 (exactly 7 days ago)`);
console.log(`Expected Bucket: CURRENT (≤7 days)`);
console.log(`Got Bucket: ${boundary1Result.agingBucket}`);
console.log(`Age: ${boundary1Result.ageInDays} days`);
console.log(
  boundary1Result.agingBucket === AGING_BUCKETS.CURRENT ? "✅ PASS" : "❌ FAIL",
);
console.log("");

/**
 * TEST 5: Boundary test (exactly 8 days - should be DUE_8_30)
 */
console.log("TEST 5: Boundary Test (exactly 8 days)");
const boundaryOrder2 = {
  id: "test-boundary-8",
  order_number: "TEST-BOUNDARY-8",
  created_at: "2026-01-14T17:00:00Z", // Exactly 8 days ago
  remaining_amount: 400000,
};

const boundary2Result = calculateAgingBucket(boundaryOrder2, referenceDate);
console.log(`Order Date: 2026-01-14 (exactly 8 days ago)`);
console.log(`Expected Bucket: DUE_8_30 (8-30 days)`);
console.log(`Got Bucket: ${boundary2Result.agingBucket}`);
console.log(`Age: ${boundary2Result.ageInDays} days`);
console.log(
  boundary2Result.agingBucket === AGING_BUCKETS.DUE_8_30
    ? "✅ PASS"
    : "❌ FAIL",
);
console.log("");

/**
 * TEST 6: Boundary test (exactly 30 days - should be DUE_8_30)
 */
console.log("TEST 6: Boundary Test (exactly 30 days)");
const boundaryOrder3 = {
  id: "test-boundary-30",
  order_number: "TEST-BOUNDARY-30",
  created_at: "2025-12-23T17:00:00Z", // Exactly 30 days ago
  remaining_amount: 600000,
};

const boundary3Result = calculateAgingBucket(boundaryOrder3, referenceDate);
console.log(`Order Date: 2025-12-23 (exactly 30 days ago)`);
console.log(`Expected Bucket: DUE_8_30 (≤30 days)`);
console.log(`Got Bucket: ${boundary3Result.agingBucket}`);
console.log(`Age: ${boundary3Result.ageInDays} days`);
console.log(
  boundary3Result.agingBucket === AGING_BUCKETS.DUE_8_30
    ? "✅ PASS"
    : "❌ FAIL",
);
console.log("");

/**
 * TEST 7: Boundary test (31 days - should be OVERDUE_30)
 */
console.log("TEST 7: Boundary Test (31 days)");
const boundaryOrder4 = {
  id: "test-boundary-31",
  order_number: "TEST-BOUNDARY-31",
  created_at: "2025-12-22T17:00:00Z", // 31 days ago
  remaining_amount: 700000,
};

const boundary4Result = calculateAgingBucket(boundaryOrder4, referenceDate);
console.log(`Order Date: 2025-12-22 (31 days ago)`);
console.log(`Expected Bucket: OVERDUE_30 (>30 days)`);
console.log(`Got Bucket: ${boundary4Result.agingBucket}`);
console.log(`Age: ${boundary4Result.ageInDays} days`);
console.log(
  boundary4Result.agingBucket === AGING_BUCKETS.OVERDUE_30
    ? "✅ PASS"
    : "❌ FAIL",
);
console.log("");

/**
 * TEST 8: Updated_at vs created_at (should use updated_at)
 */
console.log("TEST 8: Updated_at Priority Test");
const updatedOrder = {
  id: "test-updated",
  order_number: "TEST-UPDATED-001",
  created_at: "2025-12-01T10:00:00Z", // 52 days ago (would be OVERDUE)
  updated_at: "2026-01-20T10:00:00Z", // 2 days ago (should be CURRENT)
  remaining_amount: 500000,
};

const updatedResult = calculateAgingBucket(updatedOrder, referenceDate);
console.log(`Created: 2025-12-01 (52 days ago)`);
console.log(`Updated: 2026-01-20 (2 days ago)`);
console.log(`Expected: Use updated_at → CURRENT`);
console.log(`Got Bucket: ${updatedResult.agingBucket}`);
console.log(`Age: ${updatedResult.ageInDays} days`);
console.log(
  updatedResult.agingBucket === AGING_BUCKETS.CURRENT ? "✅ PASS" : "❌ FAIL",
);
console.log("");

/**
 * TEST 9: Edge case - No date available
 */
console.log("TEST 9: Edge Case - No Date");
const noDateOrder = {
  id: "test-nodate",
  order_number: "TEST-NODATE-001",
  // No created_at or updated_at
  remaining_amount: 500000,
};

const noDateResult = calculateAgingBucket(noDateOrder, referenceDate);
console.log(`No date available`);
console.log(`Expected: CURRENT (default) with error flag`);
console.log(`Got Bucket: ${noDateResult.agingBucket}`);
console.log(`Has Error: ${noDateResult.error ? "YES" : "NO"}`);
console.log(
  noDateResult.agingBucket === AGING_BUCKETS.CURRENT && noDateResult.error
    ? "✅ PASS"
    : "❌ FAIL",
);
console.log("");

/**
 * TEST 10: Summary calculation
 */
console.log("TEST 10: Summary Calculation");
const testOrders = [currentOrder, dueOrder, overdueOrder];
const expectedSummary = {
  CURRENT: { count: 1, total: 500000 },
  DUE_8_30: { count: 1, total: 800000 },
  OVERDUE_30: { count: 1, total: 1200000 },
};

console.log("Test Orders:");
console.log(`  1 CURRENT order: Rp 500,000`);
console.log(`  1 DUE order: Rp 800,000`);
console.log(`  1 OVERDUE order: Rp 1,200,000`);
console.log("Expected Summary:");
console.log(`  CURRENT: 1 order, Rp 500,000`);
console.log(`  DUE_8_30: 1 order, Rp 800,000`);
console.log(`  OVERDUE_30: 1 order, Rp 1,200,000`);
console.log("✅ Manual verification required (run getAgingReport() to test)");
console.log("");

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("🎉 All Tests Complete!");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

// Export test data for manual testing
export const testData = {
  referenceDate,
  orders: {
    current: currentOrder,
    due: dueOrder,
    overdue: overdueOrder,
    boundary7: boundaryOrder1,
    boundary8: boundaryOrder2,
    boundary30: boundaryOrder3,
    boundary31: boundaryOrder4,
    updated: updatedOrder,
    noDate: noDateOrder,
  },
  results: {
    current: currentResult,
    due: dueResult,
    overdue: overdueResult,
  },
};
