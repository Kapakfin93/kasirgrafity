/**
 * Payment Validator - Example Usage & Demo
 * Demonstrates how to use the payment consistency validation layer
 *
 * @module paymentValidatorDemo
 */

import {
  validateOrderPayments,
  validateAllOrders,
  getPaymentDiscrepancyReport,
  getValidationSummary,
  getProblematicOrders,
  validateOrderById,
  VALIDATION_STATUS,
} from "./paymentValidator";

/**
 * EXAMPLE 1: Validate a single order manually
 */
export const exampleValidateSingleOrder = () => {
  const order = {
    id: "abc-123",
    order_number: "JGL-A-20260122-0001",
    customer_name: "John Doe",
    total_amount: 1000000,
    paid_amount: 500000,
    remaining_amount: 500000,
    payment_status: "DP",
    created_at: "2026-01-22T10:00:00Z",
  };

  const payments = [
    {
      id: "p1",
      amount: 300000,
      payment_method: "CASH",
      received_by: "Kasir A",
      created_at: "2026-01-22T10:05:00Z",
    },
    {
      id: "p2",
      amount: 200000,
      payment_method: "TRANSFER",
      received_by: "Kasir B",
      created_at: "2026-01-22T11:00:00Z",
    },
  ];

  const result = validateOrderPayments(order, payments);

  console.log("Validation Result:", result);
  /*
  Output:
  {
    orderId: 'abc-123',
    orderNumber: 'JGL-A-20260122-0001',
    customerName: 'John Doe',
    status: 'OK',
    totalAmount: 1000000,
    dbPaidAmount: 500000,
    recalculatedPaid: 500000,
    dbRemainingAmount: 500000,
    recalculatedRemaining: 500000,
    paymentStatus: 'DP',
    discrepancy: {
      paidDiff: 0,
      remainingDiff: 0,
      hasMismatch: false
    },
    paymentsCount: 2,
    payments: [...],
    createdAt: '2026-01-22T10:00:00Z'
  }
  */
};

/**
 * EXAMPLE 2: Detect mismatch scenario
 */
export const exampleDetectMismatch = () => {
  const order = {
    id: "xyz-789",
    order_number: "JGL-A-20260122-0002",
    customer_name: "Jane Smith",
    total_amount: 2000000,
    paid_amount: 1000000, // DB says 1M paid
    remaining_amount: 1000000,
    payment_status: "DP",
    created_at: "2026-01-22T12:00:00Z",
  };

  const payments = [
    {
      id: "p3",
      amount: 500000,
      payment_method: "CASH",
      received_by: "Kasir A",
      created_at: "2026-01-22T12:05:00Z",
    },
    {
      id: "p4",
      amount: 300000,
      payment_method: "CASH",
      received_by: "Kasir B",
      created_at: "2026-01-22T13:00:00Z",
    },
    // Total payments = 800K, but DB says 1M paid → MISMATCH!
  ];

  const result = validateOrderPayments(order, payments);

  console.log("Mismatch Detected:", result);
  /*
  Output:
  {
    status: 'MISMATCH_PAID',
    dbPaidAmount: 1000000,
    recalculatedPaid: 800000,
    dbRemainingAmount: 1000000,
    recalculatedRemaining: 1200000,
    discrepancy: {
      paidDiff: -200000,  // DB overstated by 200K
      remainingDiff: 200000,  // DB understated remaining by 200K
      hasMismatch: true
    },
    ...
  }
  */
};

/**
 * EXAMPLE 3: Get full validation report from database
 */
export const exampleGetFullReport = async () => {
  // Get all orders with validation
  const report = await getPaymentDiscrepancyReport();

  console.log("Full Validation Report:", report);
  /*
  Output:
  {
    success: true,
    summary: {
      totalOrders: 150,
      totalValidated: 150,
      totalMismatches: 5,
      totalOK: 140,
      totalOverpaid: 2,
      totalLegacy: 3,
      totalNoPayments: 0,
      totalDiscrepancyAmount: 450000
    },
    results: [
      { orderId: '...', status: 'MISMATCH_PAID', ... },
      { orderId: '...', status: 'OK', ... },
      ...
    ],
    generatedAt: '2026-01-22T17:30:00Z'
  }
  */
};

/**
 * EXAMPLE 4: Get only problematic orders
 */
export const exampleGetProblematicOrders = async () => {
  const problematic = await getProblematicOrders();

  console.log(`Found ${problematic.length} orders with payment issues:`);
  problematic.forEach((order) => {
    console.log(`- ${order.orderNumber}: ${order.status}`);
    console.log(
      `  Discrepancy: Rp ${order.discrepancy.paidDiff.toLocaleString()}`,
    );
  });
};

/**
 * EXAMPLE 5: Validate specific order by ID
 */
export const exampleValidateById = async (orderId) => {
  const { success, result, error } = await validateOrderById(orderId);

  if (success) {
    console.log("Order Validation:", result);
    if (result.status === VALIDATION_STATUS.OK) {
      console.log("✅ Payment records are consistent");
    } else {
      console.log("⚠️ Payment discrepancy detected:", result.status);
      console.log("Paid difference:", result.discrepancy.paidDiff);
    }
  } else {
    console.error("Validation failed:", error);
  }
};

/**
 * EXAMPLE 6: Integration with Owner Dashboard
 */
export const exampleDashboardIntegration = async () => {
  // This would be called from a React component
  const { useOrderStore } = await import("../stores/useOrderStore");

  // Get validation report
  const report = await useOrderStore.getState().getPaymentValidationReport({
    onlyMismatches: true, // Only show problematic orders
  });

  if (report.success) {
    console.log("Dashboard Summary:");
    console.log(`- Total Mismatches: ${report.summary.totalMismatches}`);
    console.log(`- Total Overpaid: ${report.summary.totalOverpaid}`);
    console.log(
      `- Total Discrepancy: Rp ${report.summary.totalDiscrepancyAmount.toLocaleString()}`,
    );

    // Display problematic orders in UI
    report.results.forEach((order) => {
      console.log(`\n${order.orderNumber} - ${order.customerName}`);
      console.log(`Status: ${order.status}`);
      console.log(`DB Paid: Rp ${order.dbPaidAmount.toLocaleString()}`);
      console.log(`Actual Paid: Rp ${order.recalculatedPaid.toLocaleString()}`);
      console.log(
        `Difference: Rp ${order.discrepancy.paidDiff.toLocaleString()}`,
      );
    });
  }
};

/**
 * EXAMPLE 7: Filter by date range
 */
export const exampleDateRangeValidation = async () => {
  const startDate = new Date("2026-01-01");
  const endDate = new Date("2026-01-31");

  const report = await getPaymentDiscrepancyReport({
    startDate,
    endDate,
    onlyMismatches: true,
  });

  console.log(`Validation for January 2026:`);
  console.log(`- Orders checked: ${report.summary.totalOrders}`);
  console.log(`- Issues found: ${report.summary.totalMismatches}`);
};

/**
 * EXAMPLE 8: Handle edge cases
 */
export const exampleEdgeCases = () => {
  // Case 1: Legacy order (no payment records but DB shows paid)
  const legacyOrder = {
    id: "legacy-1",
    order_number: "OLD-001",
    total_amount: 500000,
    paid_amount: 500000, // DB says fully paid
    remaining_amount: 0,
    payment_status: "PAID",
  };
  const result1 = validateOrderPayments(legacyOrder, []); // No payment records
  console.log("Legacy Order:", result1.status); // 'LEGACY_ORDER'

  // Case 2: No payments yet
  const newOrder = {
    id: "new-1",
    order_number: "NEW-001",
    total_amount: 1000000,
    paid_amount: 0,
    remaining_amount: 1000000,
    payment_status: "UNPAID",
  };
  const result2 = validateOrderPayments(newOrder, []);
  console.log("New Order:", result2.status); // 'NO_PAYMENTS'

  // Case 3: Overpayment
  const overpaidOrder = {
    id: "over-1",
    order_number: "OVER-001",
    total_amount: 1000000,
    paid_amount: 1200000,
    remaining_amount: 0,
    payment_status: "PAID",
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
  const result3 = validateOrderPayments(overpaidOrder, overpayments);
  console.log("Overpaid Order:", result3.status); // 'OVERPAID'
};

/**
 * RECOMMENDED USAGE PATTERN FOR OWNER DASHBOARD
 */
export const recommendedDashboardPattern = async () => {
  // 1. Get quick summary on dashboard load
  const summary = await getValidationSummary();

  // Display warning badge if issues found
  if (summary.summary.totalMismatches > 0) {
    console.log(
      `⚠️ ${summary.summary.totalMismatches} payment discrepancies detected`,
    );
  }

  // 2. On user click "View Details", load full report
  const fullReport = await getPaymentDiscrepancyReport({
    onlyMismatches: true,
  });

  // 3. Display in modal or dedicated page
  return {
    hasIssues: fullReport.summary.totalMismatches > 0,
    summary: fullReport.summary,
    problematicOrders: fullReport.results,
  };
};

// Export all examples for testing
export default {
  exampleValidateSingleOrder,
  exampleDetectMismatch,
  exampleGetFullReport,
  exampleGetProblematicOrders,
  exampleValidateById,
  exampleDashboardIntegration,
  exampleDateRangeValidation,
  exampleEdgeCases,
  recommendedDashboardPattern,
};
