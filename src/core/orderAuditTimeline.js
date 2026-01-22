/**
 * Order Audit Timeline Layer
 * READ-ONLY layer for generating chronological event history
 * Combines data from orders, payments, validator, and aging analysis
 *
 * @module orderAuditTimeline
 * @author JOGLO POS Team
 * @version 1.0.0
 */

import { supabase } from "../services/supabaseClient";
import { validateOrderPayments, VALIDATION_STATUS } from "./paymentValidator";
import { calculateAgingBucket, AGING_BUCKETS } from "./receivableAging";

/**
 * Event type constants
 */
export const EVENT_TYPES = {
  ORDER_CREATED: "ORDER_CREATED",
  PAYMENT_ADDED: "PAYMENT_ADDED",
  PAYMENT_PARTIAL: "PAYMENT_PARTIAL",
  PAYMENT_COMPLETED: "PAYMENT_COMPLETED",
  OVERPAID_DETECTED: "OVERPAID_DETECTED",
  PAYMENT_MISMATCH_DETECTED: "PAYMENT_MISMATCH_DETECTED",
  ORDER_OVERDUE: "ORDER_OVERDUE",
  ORDER_DUE_SOON: "ORDER_DUE_SOON",
};

/**
 * Event labels (human-readable)
 */
const EVENT_LABELS = {
  [EVENT_TYPES.ORDER_CREATED]: "Order dibuat",
  [EVENT_TYPES.PAYMENT_ADDED]: "Pembayaran diterima",
  [EVENT_TYPES.PAYMENT_PARTIAL]: "Pembayaran sebagian (DP)",
  [EVENT_TYPES.PAYMENT_COMPLETED]: "Pembayaran lunas",
  [EVENT_TYPES.OVERPAID_DETECTED]: "Deteksi kelebihan pembayaran",
  [EVENT_TYPES.PAYMENT_MISMATCH_DETECTED]: "Deteksi ketidaksesuaian pembayaran",
  [EVENT_TYPES.ORDER_OVERDUE]: "Piutang lewat 30 hari",
  [EVENT_TYPES.ORDER_DUE_SOON]: "Piutang jatuh tempo (8-30 hari)",
};

/**
 * Build comprehensive audit timeline for an order
 * Combines order data, payments, validator results, and aging analysis
 *
 * @param {Object} order - Order object from database
 * @param {Array} payments - Array of payment records
 * @param {Object} validatorResult - Optional validator result
 * @param {Object} agingResult - Optional aging result
 * @returns {Object} Timeline with events sorted chronologically
 *
 * @example
 * const timeline = buildOrderAuditTimeline(order, payments);
 * console.log(timeline.timeline); // Array of events
 */
export const buildOrderAuditTimeline = (
  order,
  payments = [],
  validatorResult = null,
  agingResult = null,
) => {
  const events = [];

  // 1. ORDER_CREATED event
  if (order.created_at) {
    events.push({
      type: EVENT_TYPES.ORDER_CREATED,
      label: EVENT_LABELS[EVENT_TYPES.ORDER_CREATED],
      timestamp: order.created_at,
      amount: Number(order.total_amount || 0),
      customerName: order.customer_name || "Walk-in Customer",
      metadata: {
        orderNumber: order.order_number,
        totalAmount: Number(order.total_amount || 0),
      },
    });
  }

  // 2. PAYMENT events
  let cumulativePaid = 0;
  const totalAmount = Number(order.total_amount || 0);

  payments
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .forEach((payment, index) => {
      const paymentAmount = Number(payment.amount || 0);
      cumulativePaid += paymentAmount;

      // Determine payment type
      let paymentType = EVENT_TYPES.PAYMENT_ADDED;
      let paymentLabel = EVENT_LABELS[EVENT_TYPES.PAYMENT_ADDED];

      if (cumulativePaid >= totalAmount) {
        paymentType = EVENT_TYPES.PAYMENT_COMPLETED;
        paymentLabel = EVENT_LABELS[EVENT_TYPES.PAYMENT_COMPLETED];
      } else if (index === 0 && cumulativePaid < totalAmount) {
        paymentType = EVENT_TYPES.PAYMENT_PARTIAL;
        paymentLabel = EVENT_LABELS[EVENT_TYPES.PAYMENT_PARTIAL];
      }

      events.push({
        type: paymentType,
        label: paymentLabel,
        timestamp: payment.created_at,
        amount: paymentAmount,
        by: payment.received_by || "-",
        paymentMethod: payment.payment_method || "CASH",
        metadata: {
          paymentId: payment.id,
          cumulativePaid,
          remainingAmount: Math.max(0, totalAmount - cumulativePaid),
        },
      });
    });

  // 3. VALIDATOR events (if provided)
  if (validatorResult) {
    const now = new Date().toISOString();

    if (validatorResult.status === VALIDATION_STATUS.OVERPAID) {
      events.push({
        type: EVENT_TYPES.OVERPAID_DETECTED,
        label: EVENT_LABELS[EVENT_TYPES.OVERPAID_DETECTED],
        timestamp: now,
        amount: validatorResult.discrepancy?.paidDiff || 0,
        metadata: {
          dbPaidAmount: validatorResult.dbPaidAmount,
          recalculatedPaid: validatorResult.recalculatedPaid,
          excess:
            validatorResult.recalculatedPaid - validatorResult.totalAmount,
        },
      });
    }

    if (validatorResult.status === VALIDATION_STATUS.MISMATCH_PAID) {
      events.push({
        type: EVENT_TYPES.PAYMENT_MISMATCH_DETECTED,
        label: EVENT_LABELS[EVENT_TYPES.PAYMENT_MISMATCH_DETECTED],
        timestamp: now,
        amount: Math.abs(validatorResult.discrepancy?.paidDiff || 0),
        metadata: {
          dbPaidAmount: validatorResult.dbPaidAmount,
          recalculatedPaid: validatorResult.recalculatedPaid,
          discrepancy: validatorResult.discrepancy?.paidDiff || 0,
        },
      });
    }
  }

  // 4. AGING events (if provided)
  if (agingResult) {
    const now = new Date().toISOString();

    if (agingResult.agingBucket === AGING_BUCKETS.OVERDUE_30) {
      events.push({
        type: EVENT_TYPES.ORDER_OVERDUE,
        label: EVENT_LABELS[EVENT_TYPES.ORDER_OVERDUE],
        timestamp: now,
        metadata: {
          ageInDays: agingResult.ageInDays,
          remainingAmount: Number(order.remaining_amount || 0),
        },
      });
    } else if (agingResult.agingBucket === AGING_BUCKETS.DUE_8_30) {
      events.push({
        type: EVENT_TYPES.ORDER_DUE_SOON,
        label: EVENT_LABELS[EVENT_TYPES.ORDER_DUE_SOON],
        timestamp: now,
        metadata: {
          ageInDays: agingResult.ageInDays,
          remainingAmount: Number(order.remaining_amount || 0),
        },
      });
    }
  }

  // Sort events chronologically
  events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  return {
    orderId: order.id,
    orderNumber: order.order_number || `#${order.id.slice(0, 8)}`,
    customerName: order.customer_name || "Walk-in Customer",
    totalAmount: Number(order.total_amount || 0),
    timeline: events,
    eventCount: events.length,
    generatedAt: new Date().toISOString(),
  };
};

/**
 * Get complete audit timeline for a specific order by ID
 * Fetches all necessary data and builds timeline
 *
 * @param {string} orderId - Order UUID
 * @param {Object} options - Options
 * @param {boolean} options.includeValidation - Include validator analysis (default: true)
 * @param {boolean} options.includeAging - Include aging analysis (default: true)
 * @returns {Promise<Object>} Complete audit timeline
 *
 * @example
 * const audit = await getOrderAuditById('order-uuid');
 * console.log(audit.timeline); // Chronological events
 */
export const getOrderAuditById = async (orderId, options = {}) => {
  const { includeValidation = true, includeAging = true } = options;

  try {
    // Fetch order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError) throw orderError;
    if (!order) throw new Error("Order not found");

    // Fetch payments
    const { data: payments, error: paymentsError } = await supabase
      .from("order_payments")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });

    if (paymentsError) throw paymentsError;

    // Run validator if requested
    let validatorResult = null;
    if (includeValidation) {
      validatorResult = validateOrderPayments(order, payments || []);
    }

    // Run aging analysis if requested
    let agingResult = null;
    if (includeAging && Number(order.remaining_amount || 0) > 0) {
      agingResult = calculateAgingBucket(order);
    }

    // Build timeline
    const timeline = buildOrderAuditTimeline(
      order,
      payments || [],
      validatorResult,
      agingResult,
    );

    return {
      success: true,
      ...timeline,
    };
  } catch (error) {
    console.error("❌ Audit timeline error:", error);
    return {
      success: false,
      error: error.message,
      timeline: [],
    };
  }
};

/**
 * Get audit summary for a date range
 * Provides statistics about events across multiple orders
 *
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Object>} Summary statistics
 *
 * @example
 * const summary = await getAuditSummaryByDateRange(
 *   new Date('2026-01-01'),
 *   new Date('2026-01-31')
 * );
 */
export const getAuditSummaryByDateRange = async (startDate, endDate) => {
  try {
    // Fetch orders in date range
    const { data: orders, error: ordersError } = await supabase
      .from("orders")
      .select("*, payments:order_payments(*)")
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())
      .neq("production_status", "CANCELLED");

    if (ordersError) throw ordersError;

    if (!orders || orders.length === 0) {
      return {
        success: true,
        summary: {
          totalOrders: 0,
          totalPayments: 0,
          totalPaymentAmount: 0,
          totalRiskyEvents: 0,
          totalOverdueFlags: 0,
          eventCounts: {},
        },
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        generatedAt: new Date().toISOString(),
      };
    }

    // Process each order
    let totalPayments = 0;
    let totalPaymentAmount = 0;
    let totalRiskyEvents = 0;
    let totalOverdueFlags = 0;
    const eventCounts = {};

    orders.forEach((order) => {
      const payments = order.payments || [];
      const validatorResult = validateOrderPayments(order, payments);
      const agingResult =
        Number(order.remaining_amount || 0) > 0
          ? calculateAgingBucket(order)
          : null;

      const timeline = buildOrderAuditTimeline(
        order,
        payments,
        validatorResult,
        agingResult,
      );

      // Count events
      timeline.timeline.forEach((event) => {
        eventCounts[event.type] = (eventCounts[event.type] || 0) + 1;

        // Count payments
        if (
          event.type === EVENT_TYPES.PAYMENT_ADDED ||
          event.type === EVENT_TYPES.PAYMENT_PARTIAL ||
          event.type === EVENT_TYPES.PAYMENT_COMPLETED
        ) {
          totalPayments++;
          totalPaymentAmount += event.amount || 0;
        }

        // Count risky events
        if (
          event.type === EVENT_TYPES.OVERPAID_DETECTED ||
          event.type === EVENT_TYPES.PAYMENT_MISMATCH_DETECTED
        ) {
          totalRiskyEvents++;
        }

        // Count overdue flags
        if (event.type === EVENT_TYPES.ORDER_OVERDUE) {
          totalOverdueFlags++;
        }
      });
    });

    return {
      success: true,
      summary: {
        totalOrders: orders.length,
        totalPayments,
        totalPaymentAmount,
        totalRiskyEvents,
        totalOverdueFlags,
        eventCounts,
      },
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ Audit summary error:", error);
    return {
      success: false,
      error: error.message,
      summary: null,
    };
  }
};

/**
 * Get timeline for multiple orders
 *
 * @param {Array<string>} orderIds - Array of order UUIDs
 * @returns {Promise<Array>} Array of timelines
 */
export const getMultipleOrderAudits = async (orderIds) => {
  const timelines = await Promise.all(
    orderIds.map((id) => getOrderAuditById(id)),
  );
  return timelines.filter((t) => t.success);
};

/**
 * Get recent audit events across all orders
 *
 * @param {number} limit - Number of recent events to return
 * @returns {Promise<Array>} Recent events from all orders
 */
export const getRecentAuditEvents = async (limit = 50) => {
  try {
    // Fetch recent orders
    const { data: orders, error } = await supabase
      .from("orders")
      .select("*, payments:order_payments(*)")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    const allEvents = [];

    orders.forEach((order) => {
      const payments = order.payments || [];
      const validatorResult = validateOrderPayments(order, payments);
      const agingResult =
        Number(order.remaining_amount || 0) > 0
          ? calculateAgingBucket(order)
          : null;

      const timeline = buildOrderAuditTimeline(
        order,
        payments,
        validatorResult,
        agingResult,
      );

      timeline.timeline.forEach((event) => {
        allEvents.push({
          ...event,
          orderId: order.id,
          orderNumber: timeline.orderNumber,
          customerName: timeline.customerName,
        });
      });
    });

    // Sort by timestamp descending
    allEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return allEvents.slice(0, limit);
  } catch (error) {
    console.error("❌ Recent events error:", error);
    return [];
  }
};
