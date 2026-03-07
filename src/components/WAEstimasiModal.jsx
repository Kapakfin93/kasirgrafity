import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { isValidPhone, generateWALink } from "../utils/waHelper";
import { buildWAMessage } from "../utils/waMessageBuilder";
import { sendWAMessage } from "../services/fontteService";

/**
 * WAEstimasiModal.jsx
 * Smart WhatsApp notification modal specifically for POS Checkout Estimation
 * Shows editable message preview before sending WA notification via Fonnte Gateway
 */
export function WAEstimasiModal({
  isOpen,
  cartData, // Expects { items, totalAmount } or Draft object
  customerSnapshot,
  onClose,
  onSuccess, // Callback if needed after successful tracking
}) {
  const [message, setMessage] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isValidWA, setIsValidWA] = useState(false);
  const [waPhase, setWaPhase] = useState("IDLE");
  // Phases: IDLE | SENDING | SENT | FAILED

  // Parse Initial Message and Phone When Opened
  useEffect(() => {
    if (isOpen && cartData) {
      // Use microtask to avoid synchronous cascading renders during mount
      queueMicrotask(() => {
        setWaPhase("IDLE");

        // Extract Phone Number
        let initialPhone =
          customerSnapshot?.phone || customerSnapshot?.whatsapp || "";
        // Normalize to Indonesian standard
        initialPhone = initialPhone.replace(/\D/g, "");
        if (initialPhone.startsWith("0")) {
          initialPhone = "62" + initialPhone.slice(1);
        }
        setPhoneNumber(initialPhone);
        setIsValidWA(isValidPhone(initialPhone));

        // Build Message specific for Estimasi
        const msg = buildWAMessage({
          items: cartData.items || [],
          customer: customerSnapshot,
          total: cartData.totalAmount || cartData.total || 0,
        });

        setMessage(msg);
      });
    }
  }, [isOpen, cartData, customerSnapshot]);

  // Phone Validator on Input Change
  const handlePhoneChange = (e) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.startsWith("0")) {
      val = "62" + val.slice(1);
    }
    setPhoneNumber(val);
    setIsValidWA(isValidPhone(val));
  };

  if (!isOpen || !cartData) return null;

  const handleSendWA = async () => {
    if (waPhase === "SENDING" || !isValidWA) return;

    setWaPhase("SENDING");

    // 1. Send via Fonnte Gateway
    const result = await sendWAMessage(phoneNumber, message);

    if (result.success) {
      setWaPhase("SENT");
      console.log("✅ WA Estimasi terkirim via Fonnte:", result.target);
      if (onSuccess) onSuccess();
      // Optional: Auto-close after a few seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    } else {
      console.warn(
        "⚠️ Fonnte gagal:",
        result.error,
        "— fallback to wa.me universal link",
      );
      setWaPhase("FAILED");
      // 2. Fallback Mechanism (Manual Tab Open)
      const waLink = generateWALink(phoneNumber, message);
      if (waLink) {
        window.open(waLink, "_blank");
      }
      if (onSuccess) onSuccess();
    }
  };

  const customerName = customerSnapshot?.name || "Pelanggan Offline";
  const totalItemCount = cartData.items?.length || 0;

  return ReactDOM.createPortal(
    <div className="wa-modal-overlay" onClick={onClose}>
      <div className="wa-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="wa-modal-header">
          <h3>💬 Kirim WA Estimasi</h3>
          <button className="wa-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Body */}
        <div className="wa-modal-body">
          {/* Order Snapshot */}
          <div className="wa-order-info" style={{ marginBottom: "16px" }}>
            <div className="wa-order-row">
              <span>Customer:</span>
              <strong>{customerName}</strong>
            </div>
            <div className="wa-order-row">
              <span>Item di Keranjang:</span>
              <strong>{totalItemCount} Produk</strong>
            </div>
          </div>

          {/* Number Input (Interactive vs Read-only in Delivery) */}
          <div className="wa-message-section" style={{ marginBottom: "16px" }}>
            <label>📱 Nomor WhatsApp Tujuan (Mulai dengan 62):</label>
            <input
              type="text"
              className="wa-message-input"
              value={phoneNumber}
              onChange={handlePhoneChange}
              placeholder="628123456xxxx"
              style={{
                fontSize: "16px",
                fontWeight: "bold",
                fontFamily: "monospace",
                color: isValidWA ? "#10b981" : "#f43f5e",
                borderColor: isValidWA ? "#10b981" : "#f43f5e",
                padding: "10px",
                borderWidth: "2px",
                borderStyle: "solid",
                borderRadius: "8px",
                width: "100%",
                background: "rgba(15, 23, 42, 0.5)",
                marginTop: "4px",
              }}
            />
            {!isValidWA && phoneNumber.length > 0 && (
              <div
                className="wa-warning"
                style={{
                  color: "#f43f5e",
                  fontSize: "11px",
                  marginTop: "4px",
                }}
              >
                ⚠️ Format nomor tidak valid. Minimal 10 digit, awalan 62.
              </div>
            )}
            {!isValidWA && phoneNumber.length === 0 && (
              <div
                className="wa-warning"
                style={{
                  color: "#fbbf24",
                  fontSize: "11px",
                  marginTop: "4px",
                }}
              >
                ⚠️ Anda harus memasukkan nomor WhatsApp.
              </div>
            )}
          </div>

          {/* Message Preview */}
          <div className="wa-message-section" style={{ marginBottom: "0" }}>
            <label>📝 Preview Pesan (Bisa Diedit):</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={7}
              className="wa-message-input"
              style={{
                fontFamily: "monospace",
                fontSize: "12px",
                whiteSpace: "pre-wrap",
              }}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="wa-modal-footer">
          <button className="wa-btn wa-btn-cancel" onClick={onClose}>
            Batal
          </button>
          <button
            className="wa-btn wa-btn-wa"
            onClick={handleSendWA}
            disabled={!isValidWA || waPhase === "SENDING"}
            title={
              !isValidWA
                ? "Format Nomor WA tidak sesuai"
                : "Kirim pesan Estimasi via WhatsApp API"
            }
          >
            {waPhase === "SENDING" && "📤 Mengirim via API..."}
            {waPhase === "SENT" && "✅ Pesan API Terkirim!"}
            {waPhase === "FAILED" && "⚠️ Buka Tab Manual (API Gagal)"}
            {waPhase === "IDLE" && "💬 Kirim WA Estimasi"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default WAEstimasiModal;
