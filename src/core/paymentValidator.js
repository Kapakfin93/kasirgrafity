/**
 * Payment Consistency Validator
 * READ-ONLY validation layer for detecting payment discrepancies
 * between orders and order_payments tables
 *
 * @module paymentValidator
 * @author JOGLO POS Team
 * @version 1.0.0
 */

import { supabase } from "../services/supabaseClient";

/**
 * Validation status constants
 */
export const VALIDATION_STATUS = {
  OK: "OK",
  MISMATCH_PAID: "MISMATCH_PAID",
  OVERPAID: "OVERPAID",
  NO_PAYMENTS: "NO_PAYMENTS",
  LEGACY_ORDER: "LEGACY_ORDER",
};

/**
 * Tolerance for floating-point comparison (±1 Rupiah)
 */
const TOLERANCE = 1;

/**
 * Safe number comparison with tolerance
 * @param {number} a - First number
 * @param {number} b - Second number
 * @returns {boolean} True if numbers are equal within tolerance
 */
const isEqual = (a, b) => {
  return Math.abs(a - b) <= TOLERANCE;
};

/**
 * Safe number parsing
 * @param {*} value - Value to parse
 * @returns {number} Parsed number or 0
 */
const safeNumber = (value) => {
  const num = Number(value);
  return isNaN(num) ? 0 : num;
};

/**
 * Validate a single order's payment consistency
 *
 * @param {Object} order - Order object from database
 * @param {Array} payments - Array of payment records for this order
 * @returns {Object} Validation result object
 *
 * @example
 * const result = validateOrderPayments(order, payments);
 * // {
 * //   orderId: "uuid",
 * //   orderNumber: "JGL-A-20260122-0001",
 * //   status: "OK",
 * //   dbPaidAmount: 500000,
 * //   recalculatedPaid: 500000,
 * //   ...
 * // }
 */
export const validateOrderPayments = (order, payments = []) => {
  // Extract order data with safe defaults
  const orderId = order.id;
  const orderNumber = order.order_number || `#${orderId.slice(0, 8)}`;
  const totalAmount = safeNumber(order.total_amount);
  const dbPaidAmount = safeNumber(order.paid_amount);
  const dbRemainingAmount = safeNumber(order.remaining_amount);
  const paymentStatus = order.payment_status || "UNPAID";

  // Recalculate paid amount from payment records
  const recalculatedPaid = payments.reduce((sum, payment) => {
    return sum + safeNumber(payment.amount);
  }, 0);

  // Recalculate remaining amount
  const recalculatedRemaining = Math.max(0, totalAmount - recalculatedPaid);

  // Calculate discrepancies
  const paidDiff = recalculatedPaid - dbPaidAmount;
  const remainingDiff = recalculatedRemaining - dbRemainingAmount;

  // Determine validation status
  let status = VALIDATION_STATUS.OK;

  // Edge case: No payments recorded
  if (payments.length === 0) {
    if (dbPaidAmount > 0) {
      // DB says paid but no payment records exist
      status = VALIDATION_STATUS.LEGACY_ORDER;
    } else {
      // No payments and DB correctly shows 0
      status = VALIDATION_STATUS.NO_PAYMENTS;
    }
  }
  // Check for overpayment
  else if (
    recalculatedPaid > totalAmount &&
    !isEqual(recalculatedPaid, totalAmount)
  ) {
    status = VALIDATION_STATUS.OVERPAID;
  }
  // Check for paid amount mismatch
  else if (!isEqual(recalculatedPaid, dbPaidAmount)) {
    status = VALIDATION_STATUS.MISMATCH_PAID;
  }
  // Check for remaining amount mismatch (even if paid matches)
  else if (!isEqual(recalculatedRemaining, dbRemainingAmount)) {
    status = VALIDATION_STATUS.MISMATCH_PAID;
  }

  // Build result object
  return {
    orderId,
    orderNumber,
    customerName: order.customer_name || "Walk-in Customer",
    status,
    totalAmount,
    dbPaidAmount,
    recalculatedPaid,
    dbRemainingAmount,
    recalculatedRemaining,
    paymentStatus,
    discrepancy: {
      paidDiff,
      remainingDiff,
      hasMismatch: !isEqual(paidDiff, 0) || !isEqual(remainingDiff, 0),
    },
    paymentsCount: payments.length,
    payments: payments.map((p) => ({
      id: p.id,
      amount: safeNumber(p.amount),
      paymentMethod: p.payment_method || "CASH",
      receivedBy: p.received_by || "-",
      createdAt: p.created_at,
    })),
    createdAt: order.created_at,
  };
};

/**
 * Validate multiple orders in batch
 *
 * @param {Array} orders - Array of order objects
 * @param {Object} paymentsMap - Map of orderId -> payments array
 * @returns {Array} Array of validation results
 *
 * @example
 * const results = validateAllOrders(orders, paymentsMap);
 * const mismatches = results.filter(r => r.status !== 'OK');
 */
export const validateAllOrders = (orders, paymentsMap = {}) => {
  return orders.map((order) => {
    const payments = paymentsMap[order.id] || [];
    return validateOrderPayments(order, payments);
  });
};

/**
 * Get comprehensive payment discrepancy report from database
 * Fetches all orders and their payments, then validates consistency
 *
 * @param {Object} options - Query options
 * @param {Date} options.startDate - Optional start date filter
 * @param {Date} options.endDate - Optional end date filter
 * @param {boolean} options.onlyMismatches - Only return orders with discrepancies
 * @returns {Promise<Object>} Validation report with summary and details
 *
 * @example
 * const report = await getPaymentDiscrepancyReport({ onlyMismatches: true });
 * console.log(`Found ${report.summary.totalMismatches} discrepancies`);
 */
export const getPaymentDiscrepancyReport = async (options = {}) => {
  const { startDate = null, endDate = null, onlyMismatches = false } = options;

  try {
    // Build query for orders
    let ordersQuery = supabase
      .from("orders")
      .select("*")
      .neq("production_status", "CANCELLED"); // Exclude cancelled orders

    // Apply date filters if provided
    if (startDate) {
      ordersQuery = ordersQuery.gte("created_at", startDate.toISOString());
    }
    if (endDate) {
      ordersQuery = ordersQuery.lte("created_at", endDate.toISOString());
    }

    // Fetch orders
    const { data: orders, error: ordersError } = await ordersQuery.order(
      "created_at",
      { ascending: false },
    );

    if (ordersError) throw ordersError;

    if (!orders || orders.length === 0) {
      return {
        success: true,
        summary: {
          totalOrders: 0,
          totalMismatches: 0,
          totalOK: 0,
          totalOverpaid: 0,
          totalLegacy: 0,
          totalNoPayments: 0,
        },
        results: [],
        generatedAt: new Date().toISOString(),
      };
    }

    // Fetch all payments for these orders
    const orderIds = orders.map((o) => o.id);
    const { data: payments, error: paymentsError } = await supabase
      .from("order_payments")
      .select("*")
      .in("order_id", orderIds)
      .order("created_at", { ascending: true });

    if (paymentsError) throw paymentsError;

    // Build payments map: orderId -> [payments]
    const paymentsMap = {};
    (payments || []).forEach((payment) => {
      const orderId = payment.order_id;
      if (!paymentsMap[orderId]) {
        paymentsMap[orderId] = [];
      }
      paymentsMap[orderId].push(payment);
    });

    // Validate all orders
    let results = validateAllOrders(orders, paymentsMap);

    // Filter if only mismatches requested
    if (onlyMismatches) {
      results = results.filter(
        (r) =>
          r.status === VALIDATION_STATUS.MISMATCH_PAID ||
          r.status === VALIDATION_STATUS.OVERPAID ||
          r.status === VALIDATION_STATUS.LEGACY_ORDER,
      );
    }

    // Calculate summary statistics
    const summary = {
      totalOrders: orders.length,
      totalValidated: results.length,
      totalMismatches: results.filter(
        (r) => r.status === VALIDATION_STATUS.MISMATCH_PAID,
      ).length,
      totalOK: results.filter((r) => r.status === VALIDATION_STATUS.OK).length,
      totalOverpaid: results.filter(
        (r) => r.status === VALIDATION_STATUS.OVERPAID,
      ).length,
      totalLegacy: results.filter(
        (r) => r.status === VALIDATION_STATUS.LEGACY_ORDER,
      ).length,
      totalNoPayments: results.filter(
        (r) => r.status === VALIDATION_STATUS.NO_PAYMENTS,
      ).length,
      totalDiscrepancyAmount: results.reduce((sum, r) => {
        return sum + Math.abs(r.discrepancy.paidDiff);
      }, 0),
    };

    return {
      success: true,
      summary,
      results,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ Payment validation error:", error);
    return {
      success: false,
      error: error.message,
      summary: null,
      results: [],
      generatedAt: new Date().toISOString(),
    };
  }
};

/**
 * Get quick validation summary (lightweight version)
 * Only returns counts, no detailed results
 *
 * @returns {Promise<Object>} Summary statistics only
 */
export const getValidationSummary = async () => {
  const report = await getPaymentDiscrepancyReport({ onlyMismatches: false });
  return {
    success: report.success,
    summary: report.summary,
    generatedAt: report.generatedAt,
  };
};

/**
 * Get only problematic orders (mismatches and overpayments)
 *
 * @returns {Promise<Array>} Array of orders with payment issues
 */
export const getProblematicOrders = async () => {
  const report = await getPaymentDiscrepancyReport({ onlyMismatches: true });
  return report.results;
};

/**
 * Validate a specific order by ID
 *
 * @param {string} orderId - Order UUID
 * @returns {Promise<Object>} Validation result for single order
 */
export const validateOrderById = async (orderId) => {
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

    // Validate
    return {
      success: true,
      result: validateOrderPayments(order, payments || []),
    };
  } catch (error) {
    console.error("❌ Order validation error:", error);
    return {
      success: false,
      error: error.message,
      result: null,
    };
  }
};
