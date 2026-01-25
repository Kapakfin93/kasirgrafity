/**
 * src/utils/eventLogger.js (FIXED V5 - SAFE METADATA)
 * Event Logger - Client-Side Event Emitter
 * * PERBAIKAN UTAMA:
 * Pada fungsi 'logPaymentRecorded', parameter 'receivedBy' sekarang
 * dimasukkan ke dalam objek metadata. Ini mencegah nama manual (misal: Gemini)
 * tertimpa oleh nama sistem (POS_WORKSPACE) saat disimpan ke database.
 */

import { supabase } from "../services/supabaseClient";

/**
 * Log event to event_logs table
 * Fire-and-forget - errors are ignored
 */
export const logEvent = async (
  eventName,
  source,
  refId = null,
  refTable = null,
  metadata = null,
  actor = null,
) => {
  try {
    // Insert to event_logs table
    await supabase.from("event_logs").insert({
      event_name: eventName,
      source: source,
      ref_id: refId,
      ref_table: refTable,
      metadata: metadata, // <-- Data "Gemini" akan aman disini
      actor: actor, // <-- Data ini sering tertimpa sistem
      created_at: new Date().toISOString(),
    });

    // Success - do nothing (fire and forget)
  } catch (error) {
    // Failure - ignore (fire and forget)
    console.debug("Event log failed (ignored):", eventName, error.message);
  }
};

/**
 * Event 1: Web Order Received
 */
export const logWebOrderReceived = (inboxId, customerEmail = null) => {
  logEvent(
    "web_order_received",
    "WEB_LANDING",
    inboxId,
    "web_order_inbox",
    null,
    customerEmail || "anonymous",
  );
};

/**
 * Event 2: Inbox Reviewed
 */
export const logInboxReviewed = (inboxId, oldStatus, newStatus, reviewedBy) => {
  logEvent(
    "inbox_reviewed",
    "WEB_INBOX_PANEL",
    inboxId,
    "web_order_inbox",
    { old_status: oldStatus, new_status: newStatus },
    reviewedBy,
  );
};

/**
 * Event 3: POS Order Created
 */
export const logPOSOrderCreated = (orderId, orderNumber, createdBy) => {
  logEvent(
    "pos_order_created",
    "POS_WORKSPACE",
    orderId,
    "orders",
    { order_number: orderNumber },
    createdBy,
  );
};

/**
 * Event 4: Payment Recorded (DIPERBAIKI)
 * Fix: Memasukkan 'receivedBy' ke dalam Metadata agar terbaca di CCTV
 */
export const logPaymentRecorded = (
  paymentId,
  orderId,
  amount,
  method,
  receivedBy,
) => {
  // Pastikan ada nilai default jika kosong, agar tidak null
  const finalReceiver = receivedBy || "Kasir";

  logEvent(
    "payment_recorded",
    "RPC",
    paymentId,
    "order_payments",
    // 👇 INI BAGIAN YANG DIPERBAIKI 👇
    {
      order_id: orderId,
      amount: amount,
      method: method,
      received_by: finalReceiver, // <-- Masuk ke Bagasi Metadata (AMAN)
    },
    // 👆 SELESAI PERBAIKAN 👆
    finalReceiver, // Tetap kirim sebagai actor cadangan
  );
};

/**
 * Event 5: Order Status Changed
 */
export const logOrderStatusChanged = (
  orderId,
  oldStatus,
  newStatus,
  changedBy,
) => {
  logEvent(
    "order_status_changed",
    "ORDER_BOARD",
    orderId,
    "orders",
    { old_status: oldStatus, new_status: newStatus },
    changedBy,
  );
};

export default {
  logEvent,
  logWebOrderReceived,
  logInboxReviewed,
  logPOSOrderCreated,
  logPaymentRecorded,
  logOrderStatusChanged,
};
