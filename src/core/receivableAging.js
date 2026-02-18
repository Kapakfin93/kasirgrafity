/**
 * Receivable Aging Analysis Layer
 * READ-ONLY layer for analyzing outstanding receivables by age
 * Integrates with Payment Validator for financial risk detection
 *
 * @module receivableAging
 * @author JOGLO POS Team
 * @version 1.0.0
 */

import { supabase } from "../services/supabaseClient";
import { validateOrderPayments, VALIDATION_STATUS } from "./paymentValidator";

/**
 * Aging bucket constants
 */
export const AGING_BUCKETS = {
  CURRENT: "CURRENT", // 0-7 days
  DUE_8_30: "DUE_8_30", // 8-30 days
  OVERDUE_30: "OVERDUE_30", // >30 days
};

/**
 * Bucket thresholds in days
 */
const BUCKET_THRESHOLDS = {
  CURRENT_MAX: 7,
  DUE_MAX: 30,
};

/**
 * Calculate age in days between two dates
 * @param {string|Date} startDate - Start date (order created/updated)
 * @param {string|Date} referenceDate - Reference date (usually today)
 * @returns {number} Age in days
 */
const calculateDaysDifference = (startDate, referenceDate) => {
  const start = new Date(startDate);
  const reference = new Date(referenceDate);
  const diffTime = Math.abs(reference - start);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Determine aging bucket based on age in days
 * @param {number} ageInDays - Age in days
 * @returns {string} Aging bucket (CURRENT | DUE_8_30 | OVERDUE_30)
 */
const determineAgingBucket = (ageInDays) => {
  if (ageInDays <= BUCKET_THRESHOLDS.CURRENT_MAX) {
    return AGING_BUCKETS.CURRENT;
  } else if (ageInDays <= BUCKET_THRESHOLDS.DUE_MAX) {
    return AGING_BUCKETS.DUE_8_30;
  } else {
    return AGING_BUCKETS.OVERDUE_30;
  }
};

/**
 * Calculate aging bucket for a single order
 *
 * @param {Object} order - Order object from database
 * @param {Date} referenceDate - Reference date for age calculation (default: today)
 * @returns {Object} Aging information
 *
 * @example
 * const aging = calculateAgingBucket(order);
 * // {
 * //   orderId: "uuid",
 * //   orderNumber: "JGL-A-20260122-0001",
 * //   agingBucket: "DUE_8_30",
 * //   ageInDays: 15,
 * //   createdAt: "2026-01-07T10:00:00Z"
 * // }
 */
export const calculateAgingBucket = (order, referenceDate = new Date()) => {
  // Use updated_at if available, otherwise created_at
  const orderDate = order.updated_at || order.created_at;

  if (!orderDate) {
    return {
      orderId: order.id,
      orderNumber: order.order_number || `#${order.id.slice(0, 8)}`,
      agingBucket: AGING_BUCKETS.CURRENT,
      ageInDays: 0,
      createdAt: null,
      error: "No date available",
    };
  }

  const ageInDays = calculateDaysDifference(orderDate, referenceDate);
  const agingBucket = determineAgingBucket(ageInDays);

  return {
    orderId: order.id,
    orderNumber: order.order_number || `#${order.id.slice(0, 8)}`,
    agingBucket,
    ageInDays,
    createdAt: orderDate,
  };
};

/**
 * Get comprehensive aging report for all receivables
 * Integrates with payment validator to flag financial risks
 *
 * @param {Object} options - Query options
 * @param {Date} options.referenceDate - Reference date for aging (default: today)
 * @param {Date} options.startDate - Optional start date filter
 * @param {Date} options.endDate - Optional end date filter
 * @param {boolean} options.includeValidation - Include payment validation (default: true)
 * @returns {Promise<Object>} Aging report with summary and details
 *
 * @example
 * const report = await getAgingReport();
 * console.log(report.summary.OVERDUE_30.count); // Number of overdue orders
 */
export const getAgingReport = async (options = {}) => {
  const {
    referenceDate = new Date(),
    startDate = null,
    endDate = null,
    includeValidation = true,
  } = options;

  try {
    // Build query for orders with outstanding balance
    let query = supabase
      .from("orders")
      .select("*, payments:order_payments(*)")
      .gt("remaining_amount", 0)
      .neq("production_status", "CANCELLED");

    // Apply date filters if provided
    if (startDate) {
      query = query.gte("created_at", startDate.toISOString());
    }
    if (endDate) {
      query = query.lte("created_at", endDate.toISOString());
    }

    // Fetch orders
    const { data: orders, error: ordersError } = await query.order(
      "created_at",
      { ascending: false },
    );

    if (ordersError) throw ordersError;

    if (!orders || orders.length === 0) {
      return {
        success: true,
        summary: {
          [AGING_BUCKETS.CURRENT]: { count: 0, total: 0 },
          [AGING_BUCKETS.DUE_8_30]: { count: 0, total: 0 },
          [AGING_BUCKETS.OVERDUE_30]: { count: 0, total: 0 },
        },
        orders: [],
        generatedAt: new Date().toISOString(),
      };
    }

    // Initialize summary
    const summary = {
      [AGING_BUCKETS.CURRENT]: { count: 0, total: 0 },
      [AGING_BUCKETS.DUE_8_30]: { count: 0, total: 0 },
      [AGING_BUCKETS.OVERDUE_30]: { count: 0, total: 0 },
    };

    // Process each order
    const processedOrders = orders.map((order) => {
      // Calculate aging
      const aging = calculateAgingBucket(order, referenceDate);

      // Validate payment consistency if requested
      let isFinancialRisk = false;
      let validationStatus = null;

      if (includeValidation) {
        const payments = order.payments || [];
        const validation = validateOrderPayments(order, payments);
        validationStatus = validation.status;

        // Flag as financial risk if mismatch or overpaid
        if (
          validation.status === VALIDATION_STATUS.MISMATCH_PAID ||
          validation.status === VALIDATION_STATUS.OVERPAID
        ) {
          isFinancialRisk = true;
        }
      }

      // Build order result
      const orderResult = {
        orderId: order.id,
        orderNumber: order.order_number || `#${order.id.slice(0, 8)}`,
        customerName: order.customer_name || "Walk-in Customer",
        customerPhone: order.customer_phone || "-",
        remainingAmount: Number(order.remaining_amount || 0),
        totalAmount: Number(order.total_amount || 0),
        paidAmount: Number(order.paid_amount || 0),
        paymentStatus: order.payment_status || "UNPAID",
        agingBucket: aging.agingBucket,
        ageInDays: aging.ageInDays,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        isFinancialRisk,
        validationStatus,
      };

      // Update summary
      const bucket = aging.agingBucket;
      summary[bucket].count += 1;
      summary[bucket].total += orderResult.remainingAmount;

      return orderResult;
    });

    // Sort by age (oldest first)
    processedOrders.sort((a, b) => b.ageInDays - a.ageInDays);

    return {
      success: true,
      summary,
      orders: processedOrders,
      totalOrders: processedOrders.length,
      totalReceivables: processedOrders.reduce(
        (sum, o) => sum + o.remainingAmount,
        0,
      ),
      totalRiskyOrders: processedOrders.filter((o) => o.isFinancialRisk).length,
      generatedAt: new Date().toISOString(),
      referenceDate: referenceDate.toISOString(),
    };
  } catch (error) {
    console.error("❌ Aging report error:", error);
    return {
      success: false,
      error: error.message,
      summary: null,
      orders: [],
      generatedAt: new Date().toISOString(),
    };
  }
};

/**
 * Get aging summary only (lightweight version)
 * No detailed order list, just bucket counts and totals
 *
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Summary statistics only
 */
export const getAgingSummary = async (options = {}) => {
  const report = await getAgingReport(options);
  return {
    success: report.success,
    summary: report.summary,
    totalOrders: report.totalOrders,
    totalReceivables: report.totalReceivables,
    totalRiskyOrders: report.totalRiskyOrders,
    generatedAt: report.generatedAt,
  };
};

/**
 * Get only overdue receivables (>30 days)
 *
 * @returns {Promise<Array>} Array of overdue orders
 */
export const getOverdueReceivables = async () => {
  const report = await getAgingReport();
  if (!report.success) return [];

  return report.orders.filter(
    (order) => order.agingBucket === AGING_BUCKETS.OVERDUE_30,
  );
};

/**
 * Get receivables by specific bucket
 *
 * @param {string} bucket - Aging bucket (CURRENT | DUE_8_30 | OVERDUE_30)
 * @returns {Promise<Array>} Array of orders in specified bucket
 */
export const getReceivablesByBucket = async (bucket) => {
  const report = await getAgingReport();
  if (!report.success) return [];

  return report.orders.filter((order) => order.agingBucket === bucket);
};

/**
 * Get high-risk receivables (overdue + financial risk flag)
 *
 * @returns {Promise<Array>} Array of high-risk orders
 */
export const getHighRiskReceivables = async () => {
  const report = await getAgingReport({ includeValidation: true });
  if (!report.success) return [];

  return report.orders.filter(
    (order) =>
      order.agingBucket === AGING_BUCKETS.OVERDUE_30 || order.isFinancialRisk,
  );
};

/**
 * Get aging statistics for dashboard
 * Includes bucket breakdown and risk indicators
 *
 * @returns {Promise<Object>} Dashboard-ready statistics
 */
export const getAgingStatistics = async () => {
  const report = await getAgingReport({ includeValidation: true });

  if (!report.success) {
    return {
      success: false,
      error: report.error,
    };
  }

  return {
    success: true,
    buckets: {
      current: {
        count: report.summary.CURRENT.count,
        total: report.summary.CURRENT.total,
        percentage:
          report.totalOrders > 0
            ? Math.round(
                (report.summary.CURRENT.count / report.totalOrders) * 100,
              )
            : 0,
      },
      due: {
        count: report.summary.DUE_8_30.count,
        total: report.summary.DUE_8_30.total,
        percentage:
          report.totalOrders > 0
            ? Math.round(
                (report.summary.DUE_8_30.count / report.totalOrders) * 100,
              )
            : 0,
      },
      overdue: {
        count: report.summary.OVERDUE_30.count,
        total: report.summary.OVERDUE_30.total,
        percentage:
          report.totalOrders > 0
            ? Math.round(
                (report.summary.OVERDUE_30.count / report.totalOrders) * 100,
              )
            : 0,
      },
    },
    risks: {
      totalRiskyOrders: report.totalRiskyOrders,
      riskPercentage:
        report.totalOrders > 0
          ? Math.round((report.totalRiskyOrders / report.totalOrders) * 100)
          : 0,
    },
    totals: {
      orders: report.totalOrders,
      receivables: report.totalReceivables,
    },
    generatedAt: report.generatedAt,
  };
};
