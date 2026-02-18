/**
 * Order Audit Timeline Layer (V2.1 - HUMANIZER FIXED)
 * Lokasi File: src/core/orderAuditTimeline.js
 * Tugas: Menerjemahkan data teknis menjadi bahasa manusia untuk CCTV.
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
  STATUS_CHANGED: "STATUS_CHANGED", // Tambahan untuk menangkap log status
};

/**
 * HELPER: Translate Robot Code to Human Name
 * Ini adalah "Kamus" untuk mengubah POS_WORKSPACE jadi Kasir
 */
const humanizeActor = (actorCode) => {
  if (!actorCode) return "-";

  // Bersihkan string jika ada format aneh (misal: "asep - ORDER_BOARD")
  let code = actorCode.toUpperCase();

  // Mapping Kamus
  if (code.includes("POS_WORKSPACE")) return "🖥️ Kasir Depan";
  if (code.includes("ORDER_BOARD")) return "🏭 Tim Produksi";
  if (code.includes("OWNER")) return "👑 Owner";
  if (code.includes("SYSTEM")) return "🤖 Sistem Otomatis";
  if (code.includes("KASIR")) return "👤 Kasir";
  if (code.includes("OPERATOR")) return "👷 Operator";

  // Jika nama orang asli (misal: "Alex"), biarkan saja tapi rapikan
  return `👤 ${actorCode}`;
};

/**
 * Event labels (human-readable)
 */
const EVENT_LABELS = {
  [EVENT_TYPES.ORDER_CREATED]: "Order Dibuat",
  [EVENT_TYPES.PAYMENT_ADDED]: "Cicilan Masuk",
  [EVENT_TYPES.PAYMENT_PARTIAL]: "DP (Uang Muka)",
  [EVENT_TYPES.PAYMENT_COMPLETED]: "✅ LUNAS",
  [EVENT_TYPES.OVERPAID_DETECTED]: "⚠️ Kelebihan Bayar",
  [EVENT_TYPES.PAYMENT_MISMATCH_DETECTED]: "⚠️ Selisih Pembayaran",
  [EVENT_TYPES.ORDER_OVERDUE]: "🚨 Jatuh Tempo (>30 Hari)",
  [EVENT_TYPES.ORDER_DUE_SOON]: "⏰ Segera Jatuh Tempo",
};

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
      // TERAPKAN HUMANIZER DISINI
      by: humanizeActor(order.received_by || "KASIR"),
      metadata: {
        orderNumber: order.order_number,
        totalAmount: Number(order.total_amount || 0),
      },
    });
  }

  // 2. PAYMENT events (SMART LOGIC)
  let cumulativePaid = 0;
  const totalAmount = Number(order.total_amount || 0);

  // Sort pembayaran dari yang terlama ke terbaru
  payments
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .forEach((payment, index) => {
      const paymentAmount = Number(payment.amount || 0);
      cumulativePaid += paymentAmount;

      // Logika Cerdas Menentukan Label
      let paymentType = EVENT_TYPES.PAYMENT_ADDED;
      let paymentLabel = "Pembayaran Masuk";

      if (index === 0) {
        if (cumulativePaid >= totalAmount) {
          paymentType = EVENT_TYPES.PAYMENT_COMPLETED;
          paymentLabel = "Langsung Lunas";
        } else {
          paymentType = EVENT_TYPES.PAYMENT_PARTIAL;
          paymentLabel = "DP (Uang Muka)";
        }
      } else {
        if (cumulativePaid >= totalAmount) {
          paymentType = EVENT_TYPES.PAYMENT_COMPLETED;
          paymentLabel = "✅ PELUNASAN AKHIR";
        } else {
          paymentLabel = `Cicilan Ke-${index + 1}`;
        }
      }

      events.push({
        type: paymentType,
        label: paymentLabel,
        timestamp: payment.created_at,
        amount: paymentAmount,
        // TERAPKAN HUMANIZER DISINI
        by: humanizeActor(payment.received_by || "KASIR"),
        paymentMethod: payment.payment_method || "CASH",
        metadata: {
          paymentId: payment.id,
          cumulativePaid,
          remainingAmount: Math.max(0, totalAmount - cumulativePaid),
        },
      });
    });

  // 3. VALIDATOR events
  if (validatorResult) {
    const now = new Date().toISOString();
    if (validatorResult.status === VALIDATION_STATUS.OVERPAID) {
      events.push({
        type: EVENT_TYPES.OVERPAID_DETECTED,
        label: EVENT_LABELS[EVENT_TYPES.OVERPAID_DETECTED],
        timestamp: now,
        amount: validatorResult.discrepancy?.paidDiff || 0,
        by: "SYSTEM",
        metadata: {
          excess:
            validatorResult.recalculatedPaid - validatorResult.totalAmount,
        },
      });
    }
  }

  // 4. AGING events
  if (agingResult && agingResult.agingBucket === AGING_BUCKETS.OVERDUE_30) {
    events.push({
      type: EVENT_TYPES.ORDER_OVERDUE,
      label: EVENT_LABELS[EVENT_TYPES.ORDER_OVERDUE],
      timestamp: new Date().toISOString(),
      by: "SYSTEM",
      metadata: { ageInDays: agingResult.ageInDays },
    });
  }

  // Sort events chronologically (Newest First)
  events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return {
    orderId: order.id,
    orderNumber: order.order_number,
    timeline: events,
    eventCount: events.length,
  };
};

// --- FUNGSI PENGAMBIL DATA (TIDAK BERUBAH BANYAK) ---

export const getOrderAuditById = async (orderId, options = {}) => {
  const { includeValidation = true, includeAging = true } = options;
  try {
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();
    if (orderError) throw orderError;
    const { data: payments, error: paymentsError } = await supabase
      .from("order_payments")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at", { ascending: true });
    if (paymentsError) throw paymentsError;

    let validatorResult = null;
    if (includeValidation)
      validatorResult = validateOrderPayments(order, payments || []);

    let agingResult = null;
    if (includeAging && Number(order.remaining_amount || 0) > 0)
      agingResult = calculateAgingBucket(order);

    const timeline = buildOrderAuditTimeline(
      order,
      payments || [],
      validatorResult,
      agingResult,
    );
    return { success: true, ...timeline };
  } catch (error) {
    return { success: false, error: error.message, timeline: [] };
  }
};

export const getAuditSummaryByDateRange = async (startDate, endDate) => {
  return { success: true };
};
export const getRecentAuditEvents = async (limit = 50) => {
  return [];
};
