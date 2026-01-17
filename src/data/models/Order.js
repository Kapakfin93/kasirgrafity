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
    this.customerSnapshot = data.customerSnapshot || null; // { name, whatsapp }

    // Deprecated (keep for backward compatibility)
    this.customerId = data.customerId || null;
    this.customerName =
      data.customerName || data.customerSnapshot?.name || "Walk-in Customer";
    this.customerPhone =
      data.customerPhone || data.customerSnapshot?.whatsapp || "";

    // Items from transaction
    this.items = data.items || [];
    this.totalAmount = data.totalAmount || 0;

    // Financial totals (STRESS TEST COMPATIBLE)
    this.discount = data.discount || 0;
    this.grandTotal = data.grandTotal || data.totalAmount || 0;
    this.finalAmount =
      data.finalAmount || data.grandTotal || data.totalAmount || 0;

    // Payment tracking
    this.paymentStatus = data.paymentStatus || "UNPAID"; // UNPAID | DP | PAID
    this.dpAmount = data.dpAmount || 0;
    this.paidAmount = data.paidAmount || 0;
    this.remainingAmount = data.remainingAmount || 0;

    // Production tracking
    this.productionStatus = data.productionStatus || "PENDING"; // PENDING | IN_PROGRESS | READY | DELIVERED
    this.assignedTo = data.assignedTo || null; // Employee ID
    this.assignedToName = data.assignedToName || ""; // Denormalized

    // Timeline
    this.createdAt = data.createdAt || new Date().toISOString();
    this.estimatedReady = data.estimatedReady || null;
    this.completedAt = data.completedAt || null;
    this.deliveredAt = data.deliveredAt || null;

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
    this.cancelReason = data.cancelReason || null;
    this.cancelledAt = data.cancelledAt || null;
    this.financialAction = data.financialAction || null; // 'REFUND' | 'FORFEIT' | 'NONE'

    // [SOP V2.0] Tempo/VIP Access
    this.isTempo = data.isTempo || false;
  }

  /**
   * Convert to plain object for storage
   */
  toJSON() {
    return {
      id: this.id, // UUID - always included (required for Dexie v2)
      orderNumber: this.orderNumber,
      transactionId: this.transactionId,

      // Customer Snapshot (primary)
      customerSnapshot: this.customerSnapshot,

      // Deprecated (backward compatibility)
      customerId: this.customerId,
      customerName: this.customerName,
      customerPhone: this.customerPhone,

      items: this.items,
      totalAmount: this.totalAmount,

      // Financial totals
      discount: this.discount,
      grandTotal: this.grandTotal,
      finalAmount: this.finalAmount,
      paymentStatus: this.paymentStatus,
      dpAmount: this.dpAmount,
      paidAmount: this.paidAmount,
      remainingAmount: this.remainingAmount,
      productionStatus: this.productionStatus,
      assignedTo: this.assignedTo,
      assignedToName: this.assignedToName,
      createdAt: this.createdAt,
      estimatedReady: this.estimatedReady,
      completedAt: this.completedAt,
      deliveredAt: this.deliveredAt,

      // Metadata
      meta: this.meta,

      notes: this.notes,

      // [SOP V2.0] Cancellation Fields
      cancelReason: this.cancelReason,
      cancelledAt: this.cancelledAt,
      financialAction: this.financialAction,

      // [SOP V2.0] Tempo/VIP Access
      isTempo: this.isTempo,
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
