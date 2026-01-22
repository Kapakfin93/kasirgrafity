/**
 * Order Audit Timeline - Test Scenarios
 * Test script for audit timeline functionality
 */

import { buildOrderAuditTimeline, EVENT_TYPES } from "./orderAuditTimeline";

console.log("🧪 Testing Order Audit Timeline...\n");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

/**
 * TEST 1: Basic timeline (order created + payment)
 */
console.log("TEST 1: Basic Timeline");
const basicOrder = {
  id: "test-1",
  order_number: "TEST-001",
  customer_name: "Test Customer",
  total_amount: 1000000,
  created_at: "2026-01-22T10:00:00Z",
};

const basicPayments = [
  {
    id: "p1",
    amount: 1000000,
    payment_method: "CASH",
    received_by: "Kasir A",
    created_at: "2026-01-22T10:05:00Z",
  },
];

const timeline1 = buildOrderAuditTimeline(basicOrder, basicPayments);
console.log(`Events: ${timeline1.eventCount}`);
console.log(`Expected: 2 (ORDER_CREATED + PAYMENT_COMPLETED)`);
console.log(
  `Event Types:`,
  timeline1.timeline.map((e) => e.type),
);
console.log(
  timeline1.eventCount === 2 &&
    timeline1.timeline[0].type === EVENT_TYPES.ORDER_CREATED &&
    timeline1.timeline[1].type === EVENT_TYPES.PAYMENT_COMPLETED
    ? "✅ PASS"
    : "❌ FAIL",
);
console.log("");

/**
 * TEST 2: Partial payment (DP)
 */
console.log("TEST 2: Partial Payment");
const dpOrder = {
  id: "test-2",
  order_number: "TEST-002",
  customer_name: "DP Customer",
  total_amount: 1000000,
  created_at: "2026-01-22T10:00:00Z",
};

const dpPayments = [
  {
    id: "p1",
    amount: 300000, // Partial payment
    payment_method: "CASH",
    received_by: "Kasir A",
    created_at: "2026-01-22T10:05:00Z",
  },
];

const timeline2 = buildOrderAuditTimeline(dpOrder, dpPayments);
console.log(`Events: ${timeline2.eventCount}`);
console.log(`Expected: 2 (ORDER_CREATED + PAYMENT_PARTIAL)`);
const hasPartialPayment = timeline2.timeline.some(
  (e) => e.type === EVENT_TYPES.PAYMENT_PARTIAL,
);
console.log(`Has PAYMENT_PARTIAL: ${hasPartialPayment}`);
console.log(hasPartialPayment ? "✅ PASS" : "❌ FAIL");
console.log("");

/**
 * TEST 3: Multiple payments
 */
console.log("TEST 3: Multiple Payments");
const multiPayOrder = {
  id: "test-3",
  order_number: "TEST-003",
  customer_name: "Multi Payment Customer",
  total_amount: 1000000,
  created_at: "2026-01-22T10:00:00Z",
};

const multiPayments = [
  {
    id: "p1",
    amount: 300000,
    payment_method: "CASH",
    received_by: "Kasir A",
    created_at: "2026-01-22T10:05:00Z",
  },
  {
    id: "p2",
    amount: 400000,
    payment_method: "TRANSFER",
    received_by: "Kasir B",
    created_at: "2026-01-22T11:00:00Z",
  },
  {
    id: "p3",
    amount: 300000,
    payment_method: "CASH",
    received_by: "Kasir A",
    created_at: "2026-01-22T14:00:00Z",
  },
];

const timeline3 = buildOrderAuditTimeline(multiPayOrder, multiPayments);
console.log(`Events: ${timeline3.eventCount}`);
console.log(`Expected: 4 (ORDER_CREATED + 3 payments)`);
const paymentEvents = timeline3.timeline.filter(
  (e) =>
    e.type === EVENT_TYPES.PAYMENT_ADDED ||
    e.type === EVENT_TYPES.PAYMENT_PARTIAL ||
    e.type === EVENT_TYPES.PAYMENT_COMPLETED,
);
console.log(`Payment Events: ${paymentEvents.length}`);
console.log(paymentEvents.length === 3 ? "✅ PASS" : "❌ FAIL");
console.log("");

/**
 * TEST 4: Chronological sorting
 */
console.log("TEST 4: Chronological Sorting");
const sortOrder = {
  id: "test-4",
  order_number: "TEST-004",
  total_amount: 1000000,
  created_at: "2026-01-22T10:00:00Z",
};

const unsortedPayments = [
  {
    id: "p2",
    amount: 300000,
    created_at: "2026-01-22T14:00:00Z", // Later
  },
  {
    id: "p1",
    amount: 300000,
    created_at: "2026-01-22T11:00:00Z", // Earlier
  },
];

const timeline4 = buildOrderAuditTimeline(sortOrder, unsortedPayments);
const timestamps = timeline4.timeline.map((e) =>
  new Date(e.timestamp).getTime(),
);
const isSorted = timestamps.every(
  (val, i, arr) => i === 0 || arr[i - 1] <= val,
);
console.log(`Timeline sorted: ${isSorted}`);
console.log(`First event: ${timeline4.timeline[0].type}`);
console.log(`Expected: ORDER_CREATED (earliest)`);
console.log(
  isSorted && timeline4.timeline[0].type === EVENT_TYPES.ORDER_CREATED
    ? "✅ PASS"
    : "❌ FAIL",
);
console.log("");

/**
 * TEST 5: Validator integration (overpaid)
 */
console.log("TEST 5: Validator Integration (Overpaid)");
const overpaidOrder = {
  id: "test-5",
  order_number: "TEST-005",
  total_amount: 1000000,
  paid_amount: 1200000,
  created_at: "2026-01-22T10:00:00Z",
};

const overpayments = [
  {
    id: "p1",
    amount: 1200000,
    created_at: "2026-01-22T10:05:00Z",
  },
];

const { validateOrderPayments } = require("./paymentValidator");
const validatorResult5 = validateOrderPayments(overpaidOrder, overpayments);
const timeline5 = buildOrderAuditTimeline(
  overpaidOrder,
  overpayments,
  validatorResult5,
);

const hasOverpaidEvent = timeline5.timeline.some(
  (e) => e.type === EVENT_TYPES.OVERPAID_DETECTED,
);
console.log(`Has OVERPAID_DETECTED event: ${hasOverpaidEvent}`);
console.log(hasOverpaidEvent ? "✅ PASS" : "❌ FAIL");
console.log("");

/**
 * TEST 6: Validator integration (mismatch)
 */
console.log("TEST 6: Validator Integration (Mismatch)");
const mismatchOrder = {
  id: "test-6",
  order_number: "TEST-006",
  total_amount: 1000000,
  paid_amount: 800000, // DB says 800K
  created_at: "2026-01-22T10:00:00Z",
};

const mismatchPayments = [
  {
    id: "p1",
    amount: 500000, // Actual total = 500K
    created_at: "2026-01-22T10:05:00Z",
  },
];

const validatorResult6 = validateOrderPayments(mismatchOrder, mismatchPayments);
const timeline6 = buildOrderAuditTimeline(
  mismatchOrder,
  mismatchPayments,
  validatorResult6,
);

const hasMismatchEvent = timeline6.timeline.some(
  (e) => e.type === EVENT_TYPES.PAYMENT_MISMATCH_DETECTED,
);
console.log(`Has PAYMENT_MISMATCH_DETECTED event: ${hasMismatchEvent}`);
console.log(hasMismatchEvent ? "✅ PASS" : "❌ FAIL");
console.log("");

/**
 * TEST 7: Aging integration (overdue)
 */
console.log("TEST 7: Aging Integration (Overdue)");
const overdueOrder = {
  id: "test-7",
  order_number: "TEST-007",
  total_amount: 1000000,
  remaining_amount: 500000,
  created_at: "2025-12-15T10:00:00Z", // 38 days ago
};

const { calculateAgingBucket } = require("./receivableAging");
const agingResult7 = calculateAgingBucket(
  overdueOrder,
  new Date("2026-01-22T17:00:00Z"),
);
const timeline7 = buildOrderAuditTimeline(overdueOrder, [], null, agingResult7);

const hasOverdueEvent = timeline7.timeline.some(
  (e) => e.type === EVENT_TYPES.ORDER_OVERDUE,
);
console.log(`Has ORDER_OVERDUE event: ${hasOverdueEvent}`);
console.log(hasOverdueEvent ? "✅ PASS" : "❌ FAIL");
console.log("");

/**
 * TEST 8: Aging integration (due soon)
 */
console.log("TEST 8: Aging Integration (Due Soon)");
const dueOrder = {
  id: "test-8",
  order_number: "TEST-008",
  total_amount: 1000000,
  remaining_amount: 500000,
  created_at: "2026-01-07T10:00:00Z", // 15 days ago
};

const agingResult8 = calculateAgingBucket(
  dueOrder,
  new Date("2026-01-22T17:00:00Z"),
);
const timeline8 = buildOrderAuditTimeline(dueOrder, [], null, agingResult8);

const hasDueSoonEvent = timeline8.timeline.some(
  (e) => e.type === EVENT_TYPES.ORDER_DUE_SOON,
);
console.log(`Has ORDER_DUE_SOON event: ${hasDueSoonEvent}`);
console.log(hasDueSoonEvent ? "✅ PASS" : "❌ FAIL");
console.log("");

/**
 * TEST 9: Complete integration (all layers)
 */
console.log("TEST 9: Complete Integration");
const completeOrder = {
  id: "test-9",
  order_number: "TEST-009",
  total_amount: 1000000,
  paid_amount: 800000,
  remaining_amount: 200000,
  created_at: "2026-01-07T10:00:00Z",
};

const completePayments = [
  {
    id: "p1",
    amount: 500000,
    created_at: "2026-01-07T11:00:00Z",
  },
];

const validatorResult9 = validateOrderPayments(completeOrder, completePayments);
const agingResult9 = calculateAgingBucket(
  completeOrder,
  new Date("2026-01-22T17:00:00Z"),
);
const timeline9 = buildOrderAuditTimeline(
  completeOrder,
  completePayments,
  validatorResult9,
  agingResult9,
);

console.log(`Total Events: ${timeline9.eventCount}`);
console.log(
  `Event Types:`,
  timeline9.timeline.map((e) => e.type),
);
const hasAllLayers =
  timeline9.timeline.some((e) => e.type === EVENT_TYPES.ORDER_CREATED) &&
  timeline9.timeline.some((e) => e.type === EVENT_TYPES.PAYMENT_PARTIAL) &&
  timeline9.timeline.some(
    (e) => e.type === EVENT_TYPES.PAYMENT_MISMATCH_DETECTED,
  ) &&
  timeline9.timeline.some((e) => e.type === EVENT_TYPES.ORDER_DUE_SOON);
console.log(`Has events from all layers: ${hasAllLayers}`);
console.log(hasAllLayers ? "✅ PASS" : "❌ FAIL");
console.log("");

/**
 * TEST 10: Empty timeline (no payments)
 */
console.log("TEST 10: Empty Timeline (No Payments)");
const emptyOrder = {
  id: "test-10",
  order_number: "TEST-010",
  total_amount: 1000000,
  created_at: "2026-01-22T10:00:00Z",
};

const timeline10 = buildOrderAuditTimeline(emptyOrder, []);
console.log(`Events: ${timeline10.eventCount}`);
console.log(`Expected: 1 (ORDER_CREATED only)`);
console.log(timeline10.eventCount === 1 ? "✅ PASS" : "❌ FAIL");
console.log("");

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("🎉 All Tests Complete!");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

// Export test data
export const testData = {
  basicTimeline: timeline1,
  partialPayment: timeline2,
  multiplePayments: timeline3,
  chronologicalSort: timeline4,
  overpaidDetection: timeline5,
  mismatchDetection: timeline6,
  overdueDetection: timeline7,
  dueSoonDetection: timeline8,
  completeIntegration: timeline9,
  emptyTimeline: timeline10,
};
