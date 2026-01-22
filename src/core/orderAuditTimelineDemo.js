/**
 * Order Audit Timeline - Demo Usage Examples
 * Demonstrates how to use the audit timeline layer
 *
 * @module orderAuditTimelineDemo
 */

import {
  buildOrderAuditTimeline,
  getOrderAuditById,
  getAuditSummaryByDateRange,
  getRecentAuditEvents,
  EVENT_TYPES,
} from "./orderAuditTimeline";

/**
 * EXAMPLE 1: Build timeline manually
 */
export const exampleBuildTimelineManually = () => {
  const order = {
    id: "abc-123",
    order_number: "JGL-A-20260110-0001",
    customer_name: "John Doe",
    total_amount: 1000000,
    remaining_amount: 400000,
    created_at: "2026-01-10T10:00:00Z",
  };

  const payments = [
    {
      id: "p1",
      amount: 300000,
      payment_method: "CASH",
      received_by: "Kasir A",
      created_at: "2026-01-10T11:00:00Z",
    },
    {
      id: "p2",
      amount: 300000,
      payment_method: "TRANSFER",
      received_by: "Kasir B",
      created_at: "2026-01-15T14:00:00Z",
    },
  ];

  const timeline = buildOrderAuditTimeline(order, payments);

  console.log("Order Audit Timeline:");
  console.log(`Order: ${timeline.orderNumber}`);
  console.log(`Customer: ${timeline.customerName}`);
  console.log(`Total Events: ${timeline.eventCount}\n`);

  timeline.timeline.forEach((event, i) => {
    console.log(`${i + 1}. [${event.type}] ${event.label}`);
    console.log(
      `   Time: ${new Date(event.timestamp).toLocaleString("id-ID")}`,
    );
    if (event.amount) {
      console.log(`   Amount: Rp ${event.amount.toLocaleString()}`);
    }
    if (event.by) {
      console.log(`   By: ${event.by}`);
    }
    console.log("");
  });

  /*
  Output:
  1. [ORDER_CREATED] Order dibuat
     Time: 10/01/2026, 10:00:00
     Amount: Rp 1,000,000

  2. [PAYMENT_PARTIAL] Pembayaran sebagian (DP)
     Time: 10/01/2026, 11:00:00
     Amount: Rp 300,000
     By: Kasir A

  3. [PAYMENT_ADDED] Pembayaran diterima
     Time: 15/01/2026, 14:00:00
     Amount: Rp 300,000
     By: Kasir B
  */
};

/**
 * EXAMPLE 2: Get timeline by order ID
 */
export const exampleGetTimelineById = async () => {
  const orderId = "your-order-uuid";
  const audit = await getOrderAuditById(orderId);

  if (audit.success) {
    console.log(`📋 Audit Timeline for ${audit.orderNumber}`);
    console.log(`Customer: ${audit.customerName}`);
    console.log(`Total: Rp ${audit.totalAmount.toLocaleString()}`);
    console.log(`Events: ${audit.eventCount}\n`);

    audit.timeline.forEach((event) => {
      const time = new Date(event.timestamp).toLocaleString("id-ID");
      console.log(`• ${event.label} - ${time}`);
      if (event.amount) {
        console.log(`  Rp ${event.amount.toLocaleString()}`);
      }
    });
  }
};

/**
 * EXAMPLE 3: Get audit summary for date range
 */
export const exampleGetAuditSummary = async () => {
  const startDate = new Date("2026-01-01");
  const endDate = new Date("2026-01-31");

  const summary = await getAuditSummaryByDateRange(startDate, endDate);

  if (summary.success) {
    console.log("📊 Audit Summary - January 2026");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Total Orders: ${summary.summary.totalOrders}`);
    console.log(`Total Payments: ${summary.summary.totalPayments}`);
    console.log(
      `Payment Amount: Rp ${summary.summary.totalPaymentAmount.toLocaleString()}`,
    );
    console.log(`Risky Events: ${summary.summary.totalRiskyEvents}`);
    console.log(`Overdue Flags: ${summary.summary.totalOverdueFlags}`);
    console.log("");
    console.log("Event Breakdown:");
    Object.entries(summary.summary.eventCounts).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  }
};

/**
 * EXAMPLE 4: Timeline with validator integration
 */
export const exampleTimelineWithValidator = () => {
  const order = {
    id: "xyz-789",
    order_number: "JGL-A-20260120-0002",
    customer_name: "Jane Smith",
    total_amount: 1000000,
    paid_amount: 800000, // DB says 800K
    remaining_amount: 200000,
    created_at: "2026-01-20T10:00:00Z",
  };

  const payments = [
    {
      id: "p1",
      amount: 500000,
      payment_method: "CASH",
      received_by: "Kasir A",
      created_at: "2026-01-20T11:00:00Z",
    },
    {
      id: "p2",
      amount: 250000, // Total = 750K, but DB says 800K → MISMATCH
      payment_method: "TRANSFER",
      received_by: "Kasir B",
      created_at: "2026-01-21T14:00:00Z",
    },
  ];

  // Validator will detect mismatch
  const { validateOrderPayments } = require("./paymentValidator");
  const validatorResult = validateOrderPayments(order, payments);

  const timeline = buildOrderAuditTimeline(order, payments, validatorResult);

  console.log("Timeline with Validator:");
  timeline.timeline.forEach((event) => {
    const icon =
      event.type.includes("MISMATCH") || event.type.includes("OVERPAID")
        ? "⚠️"
        : "✅";
    console.log(`${icon} ${event.label}`);
    if (event.metadata) {
      console.log(`   Metadata:`, event.metadata);
    }
  });
};

/**
 * EXAMPLE 5: Timeline with aging integration
 */
export const exampleTimelineWithAging = () => {
  const order = {
    id: "old-123",
    order_number: "JGL-A-20251215-0001",
    customer_name: "Old Customer",
    total_amount: 2000000,
    paid_amount: 1000000,
    remaining_amount: 1000000,
    created_at: "2025-12-15T10:00:00Z", // 38 days ago
  };

  const payments = [
    {
      id: "p1",
      amount: 1000000,
      payment_method: "CASH",
      received_by: "Kasir A",
      created_at: "2025-12-15T11:00:00Z",
    },
  ];

  // Aging will detect overdue
  const { calculateAgingBucket } = require("./receivableAging");
  const agingResult = calculateAgingBucket(
    order,
    new Date("2026-01-22T17:00:00Z"),
  );

  const timeline = buildOrderAuditTimeline(order, payments, null, agingResult);

  console.log("Timeline with Aging:");
  timeline.timeline.forEach((event) => {
    console.log(`• ${event.label}`);
    if (event.type === EVENT_TYPES.ORDER_OVERDUE) {
      console.log(`  ⚠️ Age: ${event.metadata.ageInDays} days`);
      console.log(
        `  ⚠️ Remaining: Rp ${event.metadata.remainingAmount.toLocaleString()}`,
      );
    }
  });
};

/**
 * EXAMPLE 6: Complete timeline (all integrations)
 */
export const exampleCompleteTimeline = async () => {
  const orderId = "your-order-uuid";

  // Get complete timeline with all integrations
  const audit = await getOrderAuditById(orderId, {
    includeValidation: true,
    includeAging: true,
  });

  if (audit.success) {
    console.log("📋 Complete Audit Timeline");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`Order: ${audit.orderNumber}`);
    console.log(`Customer: ${audit.customerName}`);
    console.log(`Total: Rp ${audit.totalAmount.toLocaleString()}\n`);

    audit.timeline.forEach((event, i) => {
      const time = new Date(event.timestamp).toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      // Icon based on event type
      let icon = "•";
      if (event.type === EVENT_TYPES.ORDER_CREATED) icon = "🆕";
      if (event.type === EVENT_TYPES.PAYMENT_ADDED) icon = "💰";
      if (event.type === EVENT_TYPES.PAYMENT_COMPLETED) icon = "✅";
      if (event.type === EVENT_TYPES.OVERPAID_DETECTED) icon = "⚠️";
      if (event.type === EVENT_TYPES.PAYMENT_MISMATCH_DETECTED) icon = "⚠️";
      if (event.type === EVENT_TYPES.ORDER_OVERDUE) icon = "🚨";

      console.log(`${i + 1}. ${icon} ${event.label}`);
      console.log(`   ${time}`);
      if (event.amount) {
        console.log(`   Rp ${event.amount.toLocaleString()}`);
      }
      if (event.by) {
        console.log(`   Oleh: ${event.by}`);
      }
      console.log("");
    });

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  }
};

/**
 * EXAMPLE 7: Get recent audit events
 */
export const exampleRecentEvents = async () => {
  const recentEvents = await getRecentAuditEvents(20);

  console.log("📜 Recent Audit Events (Last 20):");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  recentEvents.forEach((event, i) => {
    const time = new Date(event.timestamp).toLocaleString("id-ID");
    console.log(`${i + 1}. ${event.orderNumber} - ${event.customerName}`);
    console.log(`   ${event.label}`);
    console.log(`   ${time}`);
    if (event.amount) {
      console.log(`   Rp ${event.amount.toLocaleString()}`);
    }
    console.log("");
  });
};

/**
 * EXAMPLE 8: Filter timeline by event type
 */
export const exampleFilterByEventType = async () => {
  const orderId = "your-order-uuid";
  const audit = await getOrderAuditById(orderId);

  if (audit.success) {
    // Get only payment events
    const paymentEvents = audit.timeline.filter(
      (e) =>
        e.type === EVENT_TYPES.PAYMENT_ADDED ||
        e.type === EVENT_TYPES.PAYMENT_PARTIAL ||
        e.type === EVENT_TYPES.PAYMENT_COMPLETED,
    );

    console.log("💰 Payment Events Only:");
    paymentEvents.forEach((event) => {
      console.log(`• ${event.label} - Rp ${event.amount.toLocaleString()}`);
      console.log(`  By: ${event.by} via ${event.paymentMethod}`);
    });

    // Get only risk events
    const riskEvents = audit.timeline.filter(
      (e) =>
        e.type === EVENT_TYPES.OVERPAID_DETECTED ||
        e.type === EVENT_TYPES.PAYMENT_MISMATCH_DETECTED ||
        e.type === EVENT_TYPES.ORDER_OVERDUE,
    );

    if (riskEvents.length > 0) {
      console.log("\n⚠️ Risk Events:");
      riskEvents.forEach((event) => {
        console.log(`• ${event.label}`);
      });
    }
  }
};

/**
 * EXAMPLE 9: Dashboard integration
 */
export const exampleDashboardIntegration = async () => {
  // Get summary for current month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const summary = await getAuditSummaryByDateRange(startOfMonth, endOfMonth);

  if (summary.success) {
    // Display in dashboard cards
    const cards = [
      {
        title: "Total Payments",
        value: summary.summary.totalPayments,
        amount: summary.summary.totalPaymentAmount,
        color: "green",
      },
      {
        title: "Risky Events",
        value: summary.summary.totalRiskyEvents,
        color: summary.summary.totalRiskyEvents > 0 ? "red" : "green",
      },
      {
        title: "Overdue Orders",
        value: summary.summary.totalOverdueFlags,
        color: summary.summary.totalOverdueFlags > 0 ? "red" : "green",
      },
    ];

    console.log("Dashboard Cards:");
    cards.forEach((card) => {
      console.log(`[${card.color.toUpperCase()}] ${card.title}: ${card.value}`);
      if (card.amount) {
        console.log(`  Rp ${card.amount.toLocaleString()}`);
      }
    });
  }
};

/**
 * EXAMPLE 10: Export timeline for reporting
 */
export const exampleExportTimeline = async () => {
  const orderId = "your-order-uuid";
  const audit = await getOrderAuditById(orderId);

  if (audit.success) {
    // Format for export (CSV-like)
    console.log(
      "Order Number,Customer,Event Type,Event Label,Timestamp,Amount,By",
    );
    audit.timeline.forEach((event) => {
      const row = [
        audit.orderNumber,
        audit.customerName,
        event.type,
        event.label,
        event.timestamp,
        event.amount || "",
        event.by || "",
      ].join(",");
      console.log(row);
    });
  }
};

// Export all examples
export default {
  exampleBuildTimelineManually,
  exampleGetTimelineById,
  exampleGetAuditSummary,
  exampleTimelineWithValidator,
  exampleTimelineWithAging,
  exampleCompleteTimeline,
  exampleRecentEvents,
  exampleFilterByEventType,
  exampleDashboardIntegration,
  exampleExportTimeline,
};
