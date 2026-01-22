/**
 * Event Logger - Client-Side Event Emitter
 * Fire-and-forget event logging to event_logs table
 *
 * RULES:
 * - Minimal payload (ID + timestamp + actor only)
 * - No listeners
 * - No automation
 * - If insert fails → IGNORE (fire and forget)
 */

import { supabase } from "../services/supabaseClient";

/**
 * Log event to event_logs table
 * Fire-and-forget - errors are ignored
 *
 * @param {string} eventName - Event name from event_contract.md
 * @param {string} source - Source of event (WEB_LANDING, POS_WORKSPACE, etc.)
 * @param {string} refId - Reference ID (order_id, inbox_id, etc.)
 * @param {string} refTable - Reference table name
 * @param {object} metadata - Optional minimal metadata
 * @param {string} actor - Who triggered the event
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
      metadata: metadata,
      actor: actor,
      created_at: new Date().toISOString(),
    });

    // Success - do nothing (fire and forget)
  } catch (error) {
    // Failure - ignore (fire and forget)
    // Don't throw, don't alert, just continue
    console.debug("Event log failed (ignored):", eventName, error.message);
  }
};

/**
 * Event 1: Web Order Received
 * Emit after INSERT to web_order_inbox
 */
export const logWebOrderReceived = (inboxId, customerEmail = null) => {
  logEvent(
    "web_order_received",
    "WEB_LANDING",
    inboxId,
    "web_order_inbox",
    null, // No metadata needed
    customerEmail || "anonymous",
  );
};

/**
 * Event 2: Inbox Reviewed
 * Emit after admin approves/rejects web order
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
 * Emit after order saved to orders table
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
 * Event 4: Payment Recorded
 * Emit after RPC add_payment_to_order succeeds
 */
export const logPaymentRecorded = (
  paymentId,
  orderId,
  amount,
  method,
  receivedBy,
) => {
  logEvent(
    "payment_recorded",
    "RPC",
    paymentId,
    "order_payments",
    { order_id: orderId, amount: amount, method: method },
    receivedBy,
  );
};

/**
 * Event 5: Order Status Changed
 * Emit after production_status update
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
