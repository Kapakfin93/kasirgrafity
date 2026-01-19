/**
 * Order Model
 * Data structure for order/production tracking
 * UUID-based primary key (Supabase Ready)
 */

import { v4 as uuidv4 } from "uuid";

export class Order {
  constructor(data = {}) {
    // Auto-generate UUID if not provided
    this.id = data.id || uuidv4();

    // Order Identification
    this.orderNumber = data.orderNumber || null; // Auto-generated: JGL-A-20260109-0001
    this.transactionId = data.transactionId || null;

    // Customer Information (NEW: Snapshot approach)
    this.customerSnapshot = data.customerSnapshot || null;

    // Deprecated (keep for backward compatibility)
    this.customerId = data.customerId || null;
    this.customerName =
      data.customerName ||
      data.customer_name ||
      data.customerSnapshot?.name ||
      "Walk-in Customer";
    this.customerPhone =
      data.customerPhone ||
      data.customer_phone ||
      data.customerSnapshot?.whatsapp ||
      "";

    // Items from transaction
    this.items = data.items || [];
    this.totalAmount = data.totalAmount || data.total_amount || 0;

    // Financial totals (STRESS TEST COMPATIBLE)
    this.discount = data.discount || 0;
    this.grandTotal =
      data.grandTotal ||
      data.grand_total ||
      data.totalAmount ||
      data.total_amount ||
      0;
    this.finalAmount =
      data.finalAmount ||
      data.final_amount ||
      data.grandTotal ||
      data.totalAmount ||
      0;

    // Payment tracking
    this.paymentStatus = data.paymentStatus || data.payment_status || "UNPAID"; // UNPAID | DP | PAID
    this.dpAmount = data.dpAmount || data.dp_amount || 0;
    this.paidAmount = data.paidAmount || data.paid_amount || 0;
    this.remainingAmount = data.remainingAmount || data.remaining_amount || 0;

    // Production tracking
    this.productionStatus =
      data.productionStatus || data.production_status || "PENDING"; // PENDING | IN_PROGRESS | READY | DELIVERED
    this.assignedTo = data.assignedTo || data.assigned_to || null; // Employee ID
    this.assignedToName = data.assignedToName || data.assigned_to_name || ""; // Denormalized

    // Timeline
    this.createdAt =
      data.createdAt || data.created_at || new Date().toISOString();
    this.estimatedReady = data.estimatedReady || data.estimated_ready || null;
    this.completedAt = data.completedAt || data.completed_at || null;
    this.deliveredAt = data.deliveredAt || data.delivered_at || null;

    // Metadata Log (Audit Trail)
    this.meta = data.meta || {
      createdAt: this.createdAt,
      createdBy: null,
      printedAt: null,
      printedBy: null,
    };

    // Notes
    this.notes = data.notes || "";

    // [SOP V2.0] Cancellation Fields
    this.cancelReason = data.cancelReason || data.cancel_reason || null;
    this.cancelledAt = data.cancelledAt || data.cancelled_at || null;
    this.financialAction =
      data.financialAction || data.financial_action || null; // 'REFUND' | 'FORFEIT' | 'NONE'

    // [SOP V2.0] Tempo/VIP Access
    this.isTempo = data.isTempo || data.is_tempo || false;

    // Payment Receiver
    this.receivedBy = data.receivedBy || data.received_by || null;
  }

  /**
   * Convert to plain object for storage
   */
  toJSON() {
    return {
      id: this.id,

      // --- KEY MAPPING FIXES ---
      // DB Column : Frontend Value
      order_number: this.orderNumber,

      // CRITICAL: Customer Data
      customer_snapshot: this.customerSnapshot, // Map camel to snake
      customer_name: this.customerName || this.customerSnapshot?.name,
      customer_phone:
        this.customerPhone || this.customerSnapshot?.whatsapp || "", // Map camel to snake

      // CRITICAL: Financials
      total_amount: this.totalAmount,
      grand_total: this.grandTotal || 0, // Map camel to snake
      final_amount: this.finalAmount,
      discount: this.discount || 0,
      paid_amount: this.paidAmount,
      remaining_amount: this.remainingAmount,
      dp_amount: this.dpAmount,

      // CRITICAL: Status Flags
      payment_status: this.paymentStatus,
      production_status: this.productionStatus,
      is_tempo: this.isTempo, // Map camel to snake

      // Audit
      received_by: this.receivedBy, // Map camel to snake
      created_at: this.createdAt, // Map camel to snake
      estimated_ready: this.estimatedReady,
      completed_at: this.completedAt,
      delivered_at: this.deliveredAt,
      cancelled_at: this.cancelledAt,
      cancel_reason: this.cancelReason,
      financial_action: this.financialAction,

      // Metadata
      items: this.items, // Ensure Supabase can handle JSONB array
      meta: this.meta,
      notes: this.notes,

      // Explicitly removed: assigned_to, assigned_to_name (if not required/mapped)
      // or map them if needed:
      assigned_to: this.assignedTo,
    };
  }

  /**
   * Create from database record
   */
  static fromDB(record) {
    return new Order(record);
  }

  /**
   * Update payment status based on amounts
   */
  updatePaymentStatus() {
    if (this.paidAmount >= this.totalAmount) {
      this.paymentStatus = "PAID";
      this.remainingAmount = 0;
    } else if (this.paidAmount > 0) {
      this.paymentStatus = "DP";
      this.remainingAmount = this.totalAmount - this.paidAmount;
    } else {
      this.paymentStatus = "UNPAID";
      this.remainingAmount = this.totalAmount;
    }
  }

  /**
   * Add payment
   */
  addPayment(amount) {
    this.paidAmount += amount;
    if (this.paidAmount === amount && amount < this.totalAmount) {
      this.dpAmount = amount;
    }
    this.updatePaymentStatus();
  }

  /**
   * Check if order is completed
   */
  isCompleted() {
    return this.productionStatus === "DELIVERED";
  }

  /**
   * Check if payment is complete
   */
  isFullyPaid() {
    return this.paymentStatus === "PAID";
  }
}
