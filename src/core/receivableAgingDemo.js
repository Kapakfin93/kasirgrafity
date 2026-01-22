/**
 * Receivable Aging - Demo Usage Examples
 * Demonstrates how to use the aging analysis layer
 *
 * @module receivableAgingDemo
 */

import {
  calculateAgingBucket,
  getAgingReport,
  getAgingSummary,
  getOverdueReceivables,
  getReceivablesByBucket,
  getHighRiskReceivables,
  getAgingStatistics,
  AGING_BUCKETS,
} from "./receivableAging";

/**
 * EXAMPLE 1: Calculate aging for a single order
 */
export const exampleCalculateSingleOrderAging = () => {
  const order = {
    id: "abc-123",
    order_number: "JGL-A-20260110-0001",
    customer_name: "John Doe",
    created_at: "2026-01-10T10:00:00Z",
    updated_at: "2026-01-15T14:00:00Z",
    remaining_amount: 500000,
  };

  const referenceDate = new Date("2026-01-22T17:00:00Z");
  const aging = calculateAgingBucket(order, referenceDate);

  console.log("Single Order Aging:", aging);
  /*
  Output:
  {
    orderId: 'abc-123',
    orderNumber: 'JGL-A-20260110-0001',
    agingBucket: 'CURRENT',  // 7 days old
    ageInDays: 7,
    createdAt: '2026-01-15T14:00:00Z'  // Uses updated_at
  }
  */
};

/**
 * EXAMPLE 2: Get full aging report
 */
export const exampleGetFullAgingReport = async () => {
  const report = await getAgingReport();

  console.log("Aging Report:", report);
  /*
  Output:
  {
    success: true,
    summary: {
      CURRENT: { count: 5, total: 1200000 },
      DUE_8_30: { count: 3, total: 800000 },
      OVERDUE_30: { count: 2, total: 450000 }
    },
    orders: [
      {
        orderId: '...',
        orderNumber: 'JGL-A-20260122-0001',
        customerName: 'John Doe',
        remainingAmount: 500000,
        agingBucket: 'OVERDUE_30',
        ageInDays: 45,
        isFinancialRisk: false,
        validationStatus: 'OK'
      },
      ...
    ],
    totalOrders: 10,
    totalReceivables: 2450000,
    totalRiskyOrders: 1,
    generatedAt: '2026-01-22T17:00:00Z'
  }
  */
};

/**
 * EXAMPLE 3: Get aging summary (lightweight)
 */
export const exampleGetAgingSummary = async () => {
  const summary = await getAgingSummary();

  console.log("Aging Summary:");
  console.log(`Total Orders: ${summary.totalOrders}`);
  console.log(
    `Total Receivables: Rp ${summary.totalReceivables.toLocaleString()}`,
  );
  console.log(`Risky Orders: ${summary.totalRiskyOrders}`);
  console.log("");
  console.log("By Bucket:");
  console.log(
    `  CURRENT (0-7 days): ${summary.summary.CURRENT.count} orders, Rp ${summary.summary.CURRENT.total.toLocaleString()}`,
  );
  console.log(
    `  DUE (8-30 days): ${summary.summary.DUE_8_30.count} orders, Rp ${summary.summary.DUE_8_30.total.toLocaleString()}`,
  );
  console.log(
    `  OVERDUE (>30 days): ${summary.summary.OVERDUE_30.count} orders, Rp ${summary.summary.OVERDUE_30.total.toLocaleString()}`,
  );
};

/**
 * EXAMPLE 4: Get only overdue receivables
 */
export const exampleGetOverdueOrders = async () => {
  const overdueOrders = await getOverdueReceivables();

  console.log(`Found ${overdueOrders.length} overdue orders:`);
  overdueOrders.forEach((order) => {
    console.log(`- ${order.orderNumber} (${order.customerName})`);
    console.log(`  Age: ${order.ageInDays} days`);
    console.log(`  Amount: Rp ${order.remainingAmount.toLocaleString()}`);
    console.log(`  Risk: ${order.isFinancialRisk ? "⚠️ YES" : "✅ NO"}`);
  });
};

/**
 * EXAMPLE 5: Get receivables by specific bucket
 */
export const exampleGetByBucket = async () => {
  const currentOrders = await getReceivablesByBucket(AGING_BUCKETS.CURRENT);
  const dueOrders = await getReceivablesByBucket(AGING_BUCKETS.DUE_8_30);
  const overdueOrders = await getReceivablesByBucket(AGING_BUCKETS.OVERDUE_30);

  console.log("Receivables by Bucket:");
  console.log(`CURRENT: ${currentOrders.length} orders`);
  console.log(`DUE (8-30): ${dueOrders.length} orders`);
  console.log(`OVERDUE (>30): ${overdueOrders.length} orders`);
};

/**
 * EXAMPLE 6: Get high-risk receivables
 */
export const exampleGetHighRiskOrders = async () => {
  const riskyOrders = await getHighRiskReceivables();

  console.log(`⚠️ Found ${riskyOrders.length} high-risk receivables:`);
  riskyOrders.forEach((order) => {
    console.log(`\n${order.orderNumber} - ${order.customerName}`);
    console.log(`  Remaining: Rp ${order.remainingAmount.toLocaleString()}`);
    console.log(`  Age: ${order.ageInDays} days (${order.agingBucket})`);
    console.log(`  Validation: ${order.validationStatus}`);
    console.log(`  Financial Risk: ${order.isFinancialRisk ? "⚠️ YES" : "NO"}`);
  });
};

/**
 * EXAMPLE 7: Get dashboard statistics
 */
export const exampleGetDashboardStats = async () => {
  const stats = await getAgingStatistics();

  console.log("📊 Aging Statistics for Dashboard:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Total Orders: ${stats.totals.orders}`);
  console.log(
    `Total Receivables: Rp ${stats.totals.receivables.toLocaleString()}`,
  );
  console.log("");
  console.log("By Bucket:");
  console.log(
    `  CURRENT (0-7 days): ${stats.buckets.current.count} (${stats.buckets.current.percentage}%)`,
  );
  console.log(`    Amount: Rp ${stats.buckets.current.total.toLocaleString()}`);
  console.log(
    `  DUE (8-30 days): ${stats.buckets.due.count} (${stats.buckets.due.percentage}%)`,
  );
  console.log(`    Amount: Rp ${stats.buckets.due.total.toLocaleString()}`);
  console.log(
    `  OVERDUE (>30 days): ${stats.buckets.overdue.count} (${stats.buckets.overdue.percentage}%)`,
  );
  console.log(`    Amount: Rp ${stats.buckets.overdue.total.toLocaleString()}`);
  console.log("");
  console.log("Risk Analysis:");
  console.log(
    `  Risky Orders: ${stats.risks.totalRiskyOrders} (${stats.risks.riskPercentage}%)`,
  );
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
};

/**
 * EXAMPLE 8: Filter by date range
 */
export const exampleDateRangeAging = async () => {
  const startDate = new Date("2026-01-01");
  const endDate = new Date("2026-01-31");

  const report = await getAgingReport({
    startDate,
    endDate,
    includeValidation: true,
  });

  console.log(`Aging Report for January 2026:`);
  console.log(`Total Orders: ${report.totalOrders}`);
  console.log(
    `Total Receivables: Rp ${report.totalReceivables.toLocaleString()}`,
  );
};

/**
 * EXAMPLE 9: Integration with Owner Dashboard
 */
export const exampleDashboardIntegration = async () => {
  // Get statistics for dashboard cards
  const stats = await getAgingStatistics();

  if (stats.success) {
    // Display summary cards
    const cards = [
      {
        title: "Current (0-7 days)",
        count: stats.buckets.current.count,
        amount: stats.buckets.current.total,
        color: "green",
      },
      {
        title: "Due (8-30 days)",
        count: stats.buckets.due.count,
        amount: stats.buckets.due.total,
        color: "yellow",
      },
      {
        title: "Overdue (>30 days)",
        count: stats.buckets.overdue.count,
        amount: stats.buckets.overdue.total,
        color: "red",
      },
    ];

    console.log("Dashboard Cards:");
    cards.forEach((card) => {
      console.log(`[${card.color.toUpperCase()}] ${card.title}`);
      console.log(
        `  ${card.count} orders | Rp ${card.amount.toLocaleString()}`,
      );
    });

    // Display risk warning if needed
    if (stats.risks.totalRiskyOrders > 0) {
      console.log(
        `\n⚠️ WARNING: ${stats.risks.totalRiskyOrders} orders have financial risks!`,
      );
    }
  }
};

/**
 * EXAMPLE 10: Combined with Payment Validator
 */
export const exampleCombinedValidation = async () => {
  const report = await getAgingReport({ includeValidation: true });

  // Filter orders that are both overdue AND have payment issues
  const criticalOrders = report.orders.filter(
    (order) =>
      order.agingBucket === AGING_BUCKETS.OVERDUE_30 && order.isFinancialRisk,
  );

  console.log(
    `🚨 CRITICAL: ${criticalOrders.length} orders are overdue AND have payment issues:`,
  );
  criticalOrders.forEach((order) => {
    console.log(`\n${order.orderNumber} - ${order.customerName}`);
    console.log(`  Age: ${order.ageInDays} days`);
    console.log(`  Remaining: Rp ${order.remainingAmount.toLocaleString()}`);
    console.log(`  Validation Status: ${order.validationStatus}`);
    console.log(`  ⚠️ REQUIRES IMMEDIATE ATTENTION`);
  });
};

/**
 * RECOMMENDED USAGE PATTERN FOR OWNER DASHBOARD
 */
export const recommendedDashboardPattern = async () => {
  // 1. Load aging statistics on dashboard mount
  const stats = await getAgingStatistics();

  // 2. Display summary cards
  console.log("Dashboard Summary:");
  console.log(
    `Total Receivables: Rp ${stats.totals.receivables.toLocaleString()}`,
  );
  console.log(
    `Overdue: ${stats.buckets.overdue.count} orders (${stats.buckets.overdue.percentage}%)`,
  );

  // 3. Show warning badge if overdue > 0
  if (stats.buckets.overdue.count > 0) {
    console.log(`⚠️ ${stats.buckets.overdue.count} overdue receivables!`);
  }

  // 4. On user click "View Details", load full report
  const handleViewDetails = async () => {
    const report = await getAgingReport({ includeValidation: true });
    return {
      summary: report.summary,
      orders: report.orders,
      riskyOrders: report.orders.filter((o) => o.isFinancialRisk),
    };
  };

  return { stats, handleViewDetails };
};

// Export all examples
export default {
  exampleCalculateSingleOrderAging,
  exampleGetFullAgingReport,
  exampleGetAgingSummary,
  exampleGetOverdueOrders,
  exampleGetByBucket,
  exampleGetHighRiskOrders,
  exampleGetDashboardStats,
  exampleDateRangeAging,
  exampleDashboardIntegration,
  exampleCombinedValidation,
  recommendedDashboardPattern,
};
