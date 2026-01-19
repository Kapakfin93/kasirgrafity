/**
 * WANotificationModal.jsx
 * Smart WhatsApp notification modal for order status updates
 * Shows editable message preview before sending WA notification
 */

import React, { useState, useEffect } from "react";
import { formatRupiah } from "../core/formatters";
import {
  isValidPhone,
  generateWALink,
  generateCompletionMessage,
  generateDeliveryMessage,
} from "../utils/waHelper";

export function WANotificationModal({
  isOpen,
  order,
  actionType, // 'COMPLETE' | 'DELIVER'
  onConfirmWithWA, // Callback: send WA + update status
  onConfirmSilent, // Callback: update status only
  onCancel,
}) {
  const [message, setMessage] = useState("");
  const [isValidWA, setIsValidWA] = useState(false);

  // Generate initial message when modal opens
  useEffect(() => {
    if (isOpen && order) {
      // Defer state updates
      queueMicrotask(() => {
        let initialMessage = "";

        // Calculate dynamic values
        const remaining =
          order.remainingAmount ?? order.totalAmount - (order.paidAmount || 0);
        const isLunas = remaining <= 0;

        if (actionType === "DELIVER") {
          if (isLunas) {
            // STANDARD MESSAGE (Paid)
            initialMessage = generateDeliveryMessage(order);
          } else {
            // DEBT REMINDER MESSAGE (Tempo/Unpaid)
            // Calculate Due Date (Default +7 days) - Bisa disesuaikan logic-nya
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 7);
            const dateStr = dueDate.toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            });

            initialMessage =
              `Halo ${order.customerName},\n\n` +
              `Pesanan Anda *${order.orderNumber}* SUDAH DITERIMA/DIAMBIL.\n\n` +
              `Status: *BELUM LUNAS (TEMPO)*\n` +
              `Sisa Tagihan: *${formatRupiah(remaining)}*\n` +
              `Jatuh Tempo: *${dateStr}*\n\n` +
              `Mohon diselesaikan sebelum tanggal tersebut.\n` +
              `Terima kasih. 🙏`;
          }
        } else {
          // COMPLETE (Ready for pickup)
          initialMessage = generateCompletionMessage(order);
        }

        setMessage(initialMessage);

        // Check if phone is valid
        const phone = order.customerPhone || order.customerSnapshot?.whatsapp;
        setIsValidWA(isValidPhone(phone));
      });
    }
  }, [isOpen, order, actionType]);

  if (!isOpen || !order) return null;

  const phone = order.customerPhone || order.customerSnapshot?.whatsapp;
  const remaining =
    order.remainingAmount ?? order.totalAmount - (order.paidAmount || 0);
  const isLunas = remaining <= 0;

  const handleSendWA = () => {
    const waLink = generateWALink(phone, message);
    if (waLink) {
      window.open(waLink, "_blank");
    }
    onConfirmWithWA();
  };

  const getTitle = () => {
    if (actionType === "DELIVER") {
      return "📦 Konfirmasi Serah Terima";
    }
    return "✅ Konfirmasi Selesai & Notifikasi";
  };

  const getStatusText = () => {
    if (actionType === "DELIVER") {
      return "Order akan ditandai SELESAI DISERAHKAN";
    }
    return "Order akan ditandai SIAP AMBIL";
  };

  return (
    <div className="wa-modal-overlay" onClick={onCancel}>
      <div className="wa-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="wa-modal-header">
          <h3>{getTitle()}</h3>
          <button className="wa-modal-close" onClick={onCancel}>
            ×
          </button>
        </div>

        {/* Body */}
        <div className="wa-modal-body">
          {/* Order Info */}
          <div className="wa-order-info">
            <div className="wa-order-row">
              <span>Order:</span>
              <strong>{order.orderNumber}</strong>
            </div>
            <div className="wa-order-row">
              <span>Customer:</span>
              <strong>{order.customerName}</strong>
            </div>
            <div className="wa-order-row">
              <span>WhatsApp:</span>
              <strong className={isValidWA ? "" : "invalid"}>
                {phone || "⚠️ Tidak ada nomor"}
              </strong>
            </div>
          </div>

          {/* Payment Status Badge */}
          <div
            className={`wa-payment-status ${isLunas ? "lunas" : "belum-lunas"}`}
          >
            {isLunas ? (
              <>✅ LUNAS</>
            ) : (
              <>⚠️ SISA BAYAR: {formatRupiah(remaining)}</>
            )}
          </div>

          {/* Message Preview */}
          <div className="wa-message-section">
            <label>📝 Preview Pesan WhatsApp:</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="wa-message-input"
            />
            {!isValidWA && (
              <div className="wa-warning">
                ⚠️ Nomor HP tidak valid. Tombol "Kirim WA" dinonaktifkan.
              </div>
            )}
          </div>

          {/* Status Change Info */}
          <div className="wa-status-change">📋 {getStatusText()}</div>
        </div>

        {/* Footer Actions */}
        <div className="wa-modal-footer">
          <button className="wa-btn wa-btn-cancel" onClick={onCancel}>
            Batal
          </button>
          <button className="wa-btn wa-btn-silent" onClick={onConfirmSilent}>
            📋 Update Status Saja
          </button>
          <button
            className="wa-btn wa-btn-wa"
            onClick={handleSendWA}
            disabled={!isValidWA}
            title={!isValidWA ? "Nomor HP tidak valid" : "Kirim pesan WhatsApp"}
          >
            💬 Kirim WA & Update
          </button>
        </div>
      </div>
    </div>
  );
}

export default WANotificationModal;
