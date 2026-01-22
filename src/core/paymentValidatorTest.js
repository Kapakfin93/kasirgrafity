/**
 * Quick Test Script for Payment Validator
 * Run this in browser console to test the validator
 */

// Test 1: Import and test basic validation
console.log("🧪 Testing Payment Validator...\n");

// Simulate a mismatch scenario
const testOrder = {
  id: "test-123",
  order_number: "TEST-001",
  customer_name: "Test Customer",
  total_amount: 1000000,
  paid_amount: 600000, // DB says 600K paid
  remaining_amount: 400000,
  payment_status: "DP",
  created_at: new Date().toISOString(),
};

const testPayments = [
  {
    id: "p1",
    amount: 300000,
    payment_method: "CASH",
    received_by: "Kasir A",
    created_at: new Date().toISOString(),
  },
  {
    id: "p2",
    amount: 250000, // Total = 550K, but DB says 600K
    payment_method: "TRANSFER",
    received_by: "Kasir B",
    created_at: new Date().toISOString(),
  },
];

// Import validator
import {
  validateOrderPayments,
  VALIDATION_STATUS,
} from "./paymentValidator.js";

// Run validation
const result = validateOrderPayments(testOrder, testPayments);

console.log("📊 Validation Result:");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log(`Order: ${result.orderNumber}`);
console.log(`Customer: ${result.customerName}`);
console.log(`Status: ${result.status}`);
console.log("");
console.log("💰 Financial Data:");
console.log(`Total Amount: Rp ${result.totalAmount.toLocaleString()}`);
console.log(`DB Paid: Rp ${result.dbPaidAmount.toLocaleString()}`);
console.log(
  `Recalculated Paid: Rp ${result.recalculatedPaid.toLocaleString()}`,
);
console.log(`DB Remaining: Rp ${result.dbRemainingAmount.toLocaleString()}`);
console.log(
  `Recalculated Remaining: Rp ${result.recalculatedRemaining.toLocaleString()}`,
);
console.log("");
console.log("⚠️  Discrepancy:");
console.log(
  `Paid Difference: Rp ${result.discrepancy.paidDiff.toLocaleString()}`,
);
console.log(
  `Remaining Difference: Rp ${result.discrepancy.remainingDiff.toLocaleString()}`,
);
console.log(
  `Has Mismatch: ${result.discrepancy.hasMismatch ? "❌ YES" : "✅ NO"}`,
);
console.log("");
console.log("📝 Payment Records:");
result.payments.forEach((p, i) => {
  console.log(
    `  ${i + 1}. Rp ${p.amount.toLocaleString()} via ${p.paymentMethod} (${p.receivedBy})`,
  );
});
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

// Test 2: Check status interpretation
if (result.status === VALIDATION_STATUS.MISMATCH_PAID) {
  console.log("✅ Test PASSED: Mismatch correctly detected!");
  console.log(`   Expected: 550,000 | DB shows: 600,000 | Diff: -50,000\n`);
} else {
  console.log("❌ Test FAILED: Mismatch not detected\n");
}

// Test 3: Test edge cases
console.log("🧪 Testing Edge Cases...\n");

// Legacy order
const legacyOrder = {
  id: "legacy-1",
  order_number: "LEGACY-001",
  customer_name: "Legacy Customer",
  total_amount: 500000,
  paid_amount: 500000,
  remaining_amount: 0,
  payment_status: "PAID",
  created_at: "2025-01-01T00:00:00Z",
};

const legacyResult = validateOrderPayments(legacyOrder, []);
console.log(`Legacy Order Status: ${legacyResult.status}`);
console.log(`Expected: LEGACY_ORDER | Got: ${legacyResult.status}`);
console.log(
  legacyResult.status === VALIDATION_STATUS.LEGACY_ORDER
    ? "✅ PASS"
    : "❌ FAIL",
);
console.log("");

// No payments
const newOrder = {
  id: "new-1",
  order_number: "NEW-001",
  customer_name: "New Customer",
  total_amount: 1000000,
  paid_amount: 0,
  remaining_amount: 1000000,
  payment_status: "UNPAID",
  created_at: new Date().toISOString(),
};

const newResult = validateOrderPayments(newOrder, []);
console.log(`New Order Status: ${newResult.status}`);
console.log(`Expected: NO_PAYMENTS | Got: ${newResult.status}`);
console.log(
  newResult.status === VALIDATION_STATUS.NO_PAYMENTS ? "✅ PASS" : "❌ FAIL",
);
console.log("");

// Overpaid
const overpaidOrder = {
  id: "over-1",
  order_number: "OVER-001",
  customer_name: "Overpaid Customer",
  total_amount: 1000000,
  paid_amount: 1200000,
  remaining_amount: 0,
  payment_status: "PAID",
  created_at: new Date().toISOString(),
};

const overpayments = [
  {
    id: "p1",
    amount: 1200000,
    payment_method: "TRANSFER",
    received_by: "Kasir",
    created_at: new Date().toISOString(),
  },
];

const overResult = validateOrderPayments(overpaidOrder, overpayments);
console.log(`Overpaid Order Status: ${overResult.status}`);
console.log(`Expected: OVERPAID | Got: ${overResult.status}`);
console.log(
  overResult.status === VALIDATION_STATUS.OVERPAID ? "✅ PASS" : "❌ FAIL",
);
console.log("");

console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
console.log("🎉 All Tests Complete!");
console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

export { testOrder, testPayments, result };
