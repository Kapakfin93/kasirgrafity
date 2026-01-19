/**
 * OrderCard Component
 * Smart Action Buttons - Strict Workflow
 * PENDING → PROSES SPK → IN_PROGRESS → SELESAI → READY → SERAHKAN → DELIVERED
 */

import React, { useState } from "react";
import PropTypes from "prop-types";
import { useOrderStore } from "../../stores/useOrderStore";
import { usePermissions } from "../../hooks/usePermissions";
import { ORDER_STATUS, PAYMENT_STATUS } from "../../core/constants";
import { formatRupiah } from "../../core/formatters";
import { formatDateTime } from "../../utils/dateHelpers";
import { NotaPreview } from "../pos/NotaPreview";
import { ConfirmModal } from "../../components/ConfirmModal";
import { PromptModal } from "../../components/PromptModal";
import { WANotificationModal } from "../../components/WANotificationModal";

export function OrderCard({ order }) {
  const { updateProductionStatus, addPayment, cancelOrder } = useOrderStore();
  const permissions = usePermissions();
  const canUpdateOrderStatus = permissions.canUpdateOrderStatus(); // Call the function!
  const [updating, setUpdating] = useState(false);

  // Edit state dihapus - Karyawan produksi tidak boleh edit order

  // Print Config State
  const [printConfig, setPrintConfig] = useState({
    show: false,
    type: "NOTA",
    autoPrint: false,
  });

  // === MODAL STATES ===
  const [settlementModal, setSettlementModal] = useState({ show: false });
  const [cancelReasonModal, setCancelReasonModal] = useState({ show: false });
  const [financialAuditModal, setFinancialAuditModal] = useState({
    show: false,
    reason: "",
  });
  const [settlementReceiver, setSettlementReceiver] = useState(""); // NEW: Receiver State
  const [finalConfirmModal, setFinalConfirmModal] = useState({
    show: false,
    reason: "",
    financialAction: "NONE",
  });

  // [SMART WA] WhatsApp notification modal state
  const [waModal, setWaModal] = useState({ show: false, actionType: null });

  const statusConfig = ORDER_STATUS[order.productionStatus];

  // === MAIN ACTION HANDLER ===
  const handleMainAction = async () => {
    if (!canUpdateOrderStatus) {
      alert("Anda tidak memiliki izin");
      return;
    }

    if (!mainAction) return;

    console.log("🔘 MAIN ACTION CLICKED:", mainAction);

    // 1. SETTLEMENT ACTIONS (Bayar & Ambil / Lunasi Tagihan)
    if (
      mainAction.type === "PAYMENT_FIRST" ||
      mainAction.type === "repayment"
    ) {
      handleSettlement();
      return;
    }

    // 2. PRODUCTION ACTIONS
    // PENDING → IN_PROGRESS: Direct update + Print SPK
    if (mainAction.type === "PROCESS_SPK") {
      setUpdating(true);
      try {
        await updateProductionStatus(order.id, "IN_PROGRESS");
        // Show SPK print modal AFTER status update
        // Use setTimeout to ensure React re-renders first
        setTimeout(() => {
          setPrintConfig({ show: true, type: "SPK", autoPrint: true });
        }, 100);
      } catch (err) {
        alert("❌ Gagal: " + err.message);
      }
      setUpdating(false);
      return;
    }

    // IN_PROGRESS → READY: Show WA modal (COMPLETE)
    if (mainAction.type === "COMPLETE_ORDER") {
      setWaModal({ show: true, actionType: "COMPLETE" });
      return;
    }

    // READY → DELIVERED: Show WA modal (DELIVER)
    if (
      mainAction.type === "HANDOVER_STANDARD" ||
      mainAction.type === "HANDOVER_VIP"
    ) {
      setWaModal({ show: true, actionType: "DELIVER" });
      return;
    }
  };

  // === WA MODAL HANDLERS ===
  const handleWAConfirmWithNotification = async () => {
    setWaModal({ show: false, actionType: null });
    setUpdating(true);
    try {
      if (waModal.actionType === "COMPLETE") {
        await updateProductionStatus(order.id, "READY");
        alert("✅ Order ditandai SIAP AMBIL + WA terkirim");
      } else if (waModal.actionType === "DELIVER") {
        await updateProductionStatus(order.id, "DELIVERED");
        alert("✅ Order SELESAI + WA terkirim");
      }
    } catch (err) {
      alert("❌ Gagal: " + err.message);
    }
    setUpdating(false);
  };

  const handleWASilentUpdate = async () => {
    setWaModal({ show: false, actionType: null });
    setUpdating(true);
    try {
      if (waModal.actionType === "COMPLETE") {
        await updateProductionStatus(order.id, "READY");
        alert("✅ Order ditandai SIAP AMBIL (tanpa WA)");
      } else if (waModal.actionType === "DELIVER") {
        await updateProductionStatus(order.id, "DELIVERED");
        alert("✅ Order SELESAI (tanpa WA)");
      }
    } catch (err) {
      alert("❌ Gagal: " + err.message);
    }
    setUpdating(false);
  };

  const handleWACancel = () => {
    setWaModal({ show: false, actionType: null });
  };

  // === SETTLEMENT HANDLER (STEP 1: Open Modal) ===
  const handleSettlement = () => {
    console.log("🔵 handleSettlement CLICKED");
    setSettlementReceiver(""); // Reset state
    setSettlementModal({ show: true });
  };

  // === SETTLEMENT EXECUTION (STEP 2: Execute after confirm) ===
  const executeSettlement = async () => {
    const sisa = order.remainingAmount || order.totalAmount - order.paidAmount;
    setSettlementModal({ show: false });
    setUpdating(true);
    try {
      await addPayment(order.id, sisa, settlementReceiver); // Pass receiver
      // Auto Print Nota Lunas
      setPrintConfig({ show: true, type: "NOTA", autoPrint: true });
    } catch (err) {
      alert("❌ Gagal: " + err.message);
    }
    setUpdating(false);
  };

  // === CANCEL ORDER HANDLER (STEP 1: Open reason modal) ===
  const handleCancelOrder = () => {
    console.log("🔴 handleCancelOrder CLICKED");
    // 🛡️ LAPIS 1: Cek Data Order
    if (!order || !order.id) {
      alert("❌ ERROR SISTEM: ID Order tidak terbaca. Hubungi IT.");
      return;
    }
    // Open reason input modal
    setCancelReasonModal({ show: true });
  };

  // === CANCEL STEP 2: After reason submitted ===
  const handleReasonSubmitted = (reason) => {
    setCancelReasonModal({ show: false });

    const amountPaid = order.paidAmount || 0;
    const hasMoneyIn = amountPaid > 0;

    if (hasMoneyIn) {
      // Need financial audit - open that modal
      setFinancialAuditModal({ show: true, reason });
    } else {
      // No money - skip to final confirm
      setFinalConfirmModal({ show: true, reason, financialAction: "NONE" });
    }
  };

  // === CANCEL STEP 3A: Financial audit (REFUND) ===
  const handleFinancialRefund = () => {
    // PENTING: Simpan reason SEBELUM close modal (menghindari race condition)
    const savedReason = financialAuditModal.reason;
    setFinancialAuditModal({ show: false, reason: "" });
    setFinalConfirmModal({
      show: true,
      reason: savedReason, // Gunakan variable yang sudah disimpan
      financialAction: "REFUND",
    });
  };

  // === CANCEL STEP 3B: Financial audit (FORFEIT) ===
  const handleFinancialForfeit = () => {
    // PENTING: Simpan reason SEBELUM close modal (menghindari race condition)
    const savedReason = financialAuditModal.reason;
    setFinancialAuditModal({ show: false, reason: "" });
    setFinalConfirmModal({
      show: true,
      reason: savedReason, // Gunakan variable yang sudah disimpan
      financialAction: "FORFEIT",
    });
  };

  // === CANCEL STEP 4: Final execution ===
  const executeCancelOrder = async () => {
    const { reason, financialAction } = finalConfirmModal;
    setFinalConfirmModal({ show: false, reason: "", financialAction: "NONE" });

    setUpdating(true);
    try {
      await cancelOrder(order.id, reason.trim(), financialAction);
      // UI akan update sendiri via store
    } catch (error) {
      console.error("Gagal membatalkan:", error);
      alert("❌ Gagal menyimpan ke database. Coba lagi.");
    } finally {
      setUpdating(false);
    }
  };

  // === MANUAL REPRINT ===
  const handleReprint = () => {
    setPrintConfig({ show: true, type: "NOTA", autoPrint: false });
  };

  // === SMART ACTION BUTTON (THE BRAIN) ===
  const getMainAction = () => {
    const isPaid = order.paymentStatus === "PAID";
    const isTempo = order.isTempo === true;
    const remaining =
      order.remainingAmount ?? order.totalAmount - (order.paidAmount || 0);
    const hasDebt = remaining > 0;

    switch (order.productionStatus) {
      case "PENDING":
        return {
          label: "🖨️ PROSES SPK",
          color: "#3b82f6", // Blue
          type: "PROCESS_SPK",
          disabled: false,
        };

      case "IN_PROGRESS":
        return {
          label: "✅ TANDAI SELESAI",
          color: "#22c55e", // Green
          type: "COMPLETE_ORDER",
          disabled: false,
        };

      case "READY":
        if (isPaid) {
          // Case 1: LUNAS -> SERAHKAN (Standard)
          return {
            label: "📦 SERAHKAN",
            color: "#64748b", // Slate
            type: "HANDOVER_STANDARD",
            disabled: false,
          };
        } else if (isTempo) {
          // Case 2: TEMPO (VIP) -> SERAHKAN (Warning/Bypass)
          return {
            label: "📦 SERAHKAN (VIP)",
            color: "#f59e0b", // Amber/Orange (Caution)
            type: "HANDOVER_VIP",
            disabled: false,
          };
        } else {
          // Case 3: BELUM LUNAS -> BAYAR DULU
          return {
            label: "💰 BAYAR & AMBIL",
            color: "#16a34a", // Money Green
            type: "PAYMENT_FIRST",
            disabled: false,
          };
        }

      case "DELIVERED":
        if (hasDebt) {
          // Case 4: SUDAH DIAMBIL TAPI UTANG -> NAGIH
          return {
            label: "💳 LUNASI TAGIHAN",
            color: "#16a34a", // Money Green
            type: "repayment",
            disabled: false,
          };
        }
        return null; // Selesai & Lunas -> No button

      default:
        return null;
    }
  };

  const mainAction = getMainAction();

  // Check if order can be cancelled
  const canCancel =
    order.productionStatus !== "CANCELLED" &&
    order.productionStatus !== "DELIVERED";

  // Payment Status Check for Badge
  const isLunas = order.paymentStatus === "PAID";

  // Helper for Badge Label to avoid nested ternary in JSX
  let paymentBadgeLabel = "🔴 BELUM BAYAR";
  if (isLunas) {
    paymentBadgeLabel = "✅ LUNAS";
  } else if (order.paymentStatus === "DP") {
    paymentBadgeLabel = "⏳ DP";
  }

  return (
    <div
      style={{
        background: "#1f2937", // bg-gray-800
        borderRadius: "12px",
        padding: "16px",
        marginBottom: "16px",
        border: "1px solid #374151",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
      }}
    >
      {/* === HEADER: STATUS & IDENTITY === */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
          paddingBottom: "12px",
          borderBottom: "2px solid #374151",
        }}
      >
        {/* LEFT: Order ID + Customer */}
        <div>
          <div
            style={{
              fontSize: "18px",
              fontWeight: "900",
              color: "white",
              marginBottom: "4px",
            }}
          >
            {/* Source Indicator */}
            <span
              title={order.source === "ONLINE" ? "Order Online" : "Order Kasir"}
            >
              {order.source === "ONLINE" ? "🌐" : "🏪"}
            </span>{" "}
            {order.orderNumber || `#${String(order.id).slice(0, 8)}`}
          </div>
          <div
            style={{
              fontSize: "14px",
              fontWeight: "600",
              color: "#9ca3af",
            }}
          >
            👤 {order.customerName}
            {order.customerPhone && (
              <span style={{ marginLeft: "10px", fontSize: "12px" }}>
                📞 {order.customerPhone}
              </span>
            )}
          </div>
        </div>

        {/* RIGHT: Payment Badge + Status */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {/* Mini Print Button */}
          <button
            onClick={handleReprint}
            style={{
              background: "none",
              border: "1px solid #4b5563",
              borderRadius: "6px",
              padding: "6px 10px",
              cursor: "pointer",
              fontSize: "14px",
              color: "#9ca3af",
              transition: "all 0.2s",
            }}
            title="Cetak Ulang Nota"
            onMouseEnter={(e) => (e.currentTarget.style.color = "white")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
          >
            🖨️
          </button>

          {/* Payment Badge - HIGH CONTRAST */}
          <span
            style={{
              backgroundColor: isLunas ? "#16a34a" : "#dc2626",
              color: "white",
              padding: "6px 12px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: "900",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              boxShadow: isLunas
                ? "0 0 10px rgba(22, 163, 74, 0.4)"
                : "0 0 10px rgba(220, 38, 38, 0.4)",
            }}
          >
            {paymentBadgeLabel}
          </span>

          {/* Production Status Badge */}
          <span
            style={{
              backgroundColor:
                order.productionStatus === "CANCELLED"
                  ? "#ef4444"
                  : statusConfig?.color || "#94a3b8",
              color: "white",
              padding: "6px 12px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: "900",
              textTransform: "uppercase",
            }}
          >
            {order.productionStatus === "CANCELLED"
              ? "🚫 DIBATALKAN"
              : statusConfig?.label || order.productionStatus}
          </span>
        </div>
      </div>

      {/* === CANCELLED REASON === */}
      {order.productionStatus === "CANCELLED" && order.cancelReason && (
        <div
          style={{
            marginBottom: "12px",
            background: "#fef2f2",
            color: "#b91c1c",
            padding: "10px 12px",
            borderRadius: "8px",
            fontSize: "12px",
            border: "1px solid #fecaca",
          }}
        >
          <strong>🚫 Dibatalkan:</strong> {order.cancelReason}
          {order.cancelledAt && (
            <div
              style={{ fontSize: "10px", color: "#94a3b8", marginTop: "4px" }}
            >
              {formatDateTime(order.cancelledAt)}
            </div>
          )}
        </div>
      )}

      {/* === BODY: PRODUCTION SPECS (ALWAYS VISIBLE) === */}
      <div
        style={{
          background: "#111827", // Darker background for content
          padding: "14px",
          borderRadius: "8px",
          marginBottom: "12px",
        }}
      >
        {(order.items || []).map((item, idx) => (
          <div
            key={idx}
            style={{
              paddingBottom: "12px",
              marginBottom: "12px",
              borderBottom:
                idx < order.items.length - 1 ? "1px dashed #374151" : "none",
            }}
          >
            {/* Product Name - Large, Bold, White */}
            <div
              style={{
                fontSize: "16px",
                fontWeight: "700",
                color: "white",
                marginBottom: "6px",
              }}
            >
              x{item.qty} {item.productName}
            </div>

            {/* Description (if exists) */}
            {item.description && (
              <div
                style={{
                  fontSize: "12px",
                  color: "#9ca3af",
                  marginBottom: "4px",
                }}
              >
                ({item.description})
              </div>
            )}

            {/* ADVANCED NOTES - HIGH CONTRAST YELLOW/AMBER */}
            {item.notes && (
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "700",
                  color: "#fbbf24", // text-yellow-400
                  marginTop: "6px",
                  padding: "6px 8px",
                  background: "rgba(251, 191, 36, 0.1)",
                  borderLeft: "3px solid #fbbf24",
                  borderRadius: "4px",
                }}
              >
                📋 {item.notes}
              </div>
            )}

            {/* ADVANCED CUSTOM INPUTS - Bordered Monospace Box */}
            {item.meta?.detail_options?.custom_inputs && (
              <div
                style={{
                  marginTop: "10px",
                  padding: "10px",
                  background: "#0f172a",
                  border: "1px solid #4b5563",
                  borderRadius: "6px",
                  maxHeight: "150px",
                  overflowY: "auto",
                  fontFamily: "monospace",
                  fontSize: "11px",
                  lineHeight: "1.6",
                }}
              >
                <div
                  style={{
                    color: "#fbbf24",
                    fontWeight: "700",
                    marginBottom: "6px",
                    textTransform: "uppercase",
                    fontSize: "10px",
                    letterSpacing: "0.5px",
                  }}
                >
                  🔧 DETAIL PRODUKSI:
                </div>
                {Object.entries(item.meta.detail_options.custom_inputs).map(
                  ([key, value]) => (
                    <div
                      key={key}
                      style={{
                        color: "#e5e7eb",
                        marginBottom: "3px",
                      }}
                    >
                      <span style={{ color: "#60a5fa", fontWeight: "600" }}>
                        {key}:
                      </span>{" "}
                      {value}
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* === PAYMENT INFO (Compact) === */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "10px 12px",
          background:
            order.paymentStatus === "PAID"
              ? "rgba(34, 197, 94, 0.1)"
              : "rgba(239, 68, 68, 0.1)",
          borderRadius: "6px",
          marginBottom: "12px",
          border: `1px solid ${order.paymentStatus === "PAID" ? "#16a34a" : "#dc2626"}`,
        }}
      >
        <span
          style={{
            fontSize: "13px",
            fontWeight: "700",
            color: "#9ca3af",
          }}
        >
          Total
        </span>
        <span
          style={{
            fontSize: "15px",
            fontWeight: "900",
            color: "white",
          }}
        >
          {formatRupiah(order.totalAmount)}
        </span>
      </div>

      {/* === TIMELINE === */}
      <div
        style={{
          fontSize: "11px",
          color: "#6b7280",
          marginBottom: "12px",
        }}
      >
        📅 {formatDateTime(order.createdAt)}
      </div>

      {/* === ACTION BUTTONS === */}
      {order.productionStatus !== "CANCELLED" && (
        <div style={{ display: "flex", gap: "10px" }}>
          {/* CENTER: Main Action Button */}
          {mainAction && canUpdateOrderStatus && (
            <button
              onClick={handleMainAction}
              disabled={updating || mainAction.disabled}
              title={
                mainAction.disabled
                  ? "Belum bisa diproses - Bayar dulu atau set Tempo"
                  : ""
              }
              style={{
                flex: 2,
                padding: "14px",
                backgroundColor: mainAction.color,
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontWeight: "900",
                cursor:
                  updating || mainAction.disabled ? "not-allowed" : "pointer",
                fontSize: "14px",
                opacity: updating || mainAction.disabled ? 0.5 : 1,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                boxShadow: !mainAction.disabled
                  ? "0 4px 12px rgba(0,0,0,0.3)"
                  : "none",
                transition: "all 0.2s",
              }}
            >
              {updating ? "⏳..." : mainAction.label}
              {mainAction.disabled && " 🔒"}
            </button>
          )}

          {/* RIGHT: Cancel Button */}
          {canCancel && canUpdateOrderStatus && (
            <button
              onClick={handleCancelOrder}
              disabled={updating}
              style={{
                padding: "12px 14px",
                backgroundColor: "transparent",
                color: "#ef4444",
                border: "2px solid #ef4444",
                borderRadius: "8px",
                fontWeight: "800",
                cursor: updating ? "not-allowed" : "pointer",
                fontSize: "12px",
                opacity: updating ? 0.7 : 1,
                transition: "all 0.2s",
                textTransform: "uppercase",
              }}
              onMouseEnter={(e) => {
                if (!updating) {
                  e.currentTarget.style.backgroundColor = "#dc2626";
                  e.currentTarget.style.color = "white";
                }
              }}
              onMouseLeave={(e) => {
                if (!updating) {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "#ef4444";
                }
              }}
              title="Batalkan Order"
            >
              🚫 BATAL
            </button>
          )}
        </div>
      )}

      {/* EDIT MODAL DIHAPUS - Karyawan produksi tidak boleh edit order */}

      {/* === NOTA PREVIEW MODAL === */}
      {printConfig.show && (
        <NotaPreview
          items={order.items}
          totalAmount={order.totalAmount}
          paymentState={{
            amountPaid: order.paidAmount,
            mode: order.paymentStatus === "PAID" ? "LUNAS" : "DP",
          }}
          order={order}
          type={printConfig.type}
          autoPrint={printConfig.autoPrint}
          onClose={() =>
            setPrintConfig({ ...printConfig, show: false, autoPrint: false })
          }
          onPrint={() => window.print()}
        />
      )}

      {/* === SETTLEMENT MODAL === */}
      <ConfirmModal
        isOpen={settlementModal.show}
        title="💸 Konfirmasi Pelunasan"
        message={
          <div>
            <p style={{ marginBottom: "8px" }}>Terima pelunasan sebesar:</p>
            <p
              style={{
                fontSize: "24px",
                fontWeight: "bold",
                color: "#22c55e",
                margin: "12px 0",
              }}
            >
              {formatRupiah(
                order.remainingAmount || order.totalAmount - order.paidAmount,
              )}
            </p>
            <p style={{ fontSize: "12px", color: "#94a3b8" }}>
              Order: {order.orderNumber}
            </p>
            {/* NEW: Receiver Input */}
            <div style={{ marginTop: "16px", textAlign: "left" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: "bold",
                  marginBottom: "4px",
                  color: "#475569",
                }}
              >
                Diterima Oleh:
              </label>
              <input
                type="text"
                placeholder="Nama Kasir / Penerima..."
                value={settlementReceiver}
                onChange={(e) => setSettlementReceiver(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  fontSize: "14px",
                }}
              />
            </div>
          </div>
        }
        confirmText="Ya, Terima"
        cancelText="Batal"
        confirmColor="#22c55e"
        onConfirm={executeSettlement}
        onCancel={() => setSettlementModal({ show: false })}
      />

      {/* === CANCEL REASON MODAL (STEP 1) === */}
      <PromptModal
        isOpen={cancelReasonModal.show}
        title="🛑 Pembatalan Order"
        message={`Anda akan membatalkan order: ${order.orderNumber}`}
        placeholder="Masukkan alasan pembatalan..."
        submitText="Lanjutkan"
        submitColor="#ef4444"
        onSubmit={handleReasonSubmitted}
        onCancel={() => setCancelReasonModal({ show: false })}
        required={true}
      />

      {/* === FINANCIAL AUDIT MODAL (STEP 2) === */}
      <ConfirmModal
        isOpen={financialAuditModal.show}
        title="💰 Audit Keuangan"
        message={
          <div>
            <p style={{ marginBottom: "12px" }}>
              Order ini memiliki pembayaran:
            </p>
            <p
              style={{
                fontSize: "20px",
                fontWeight: "bold",
                color: "#f59e0b",
                margin: "8px 0",
              }}
            >
              {formatRupiah(order.paidAmount || 0)}
            </p>
            <p
              style={{
                marginTop: "16px",
                padding: "12px",
                background: "#f8fafc",
                borderRadius: "8px",
                fontSize: "13px",
                color: "#475569",
              }}
            >
              Pilih nasib uang pembayaran:
            </p>
          </div>
        }
        confirmText="💸 REFUND (Dikembalikan)"
        cancelText="🔥 HANGUS (Masuk Kas)"
        confirmColor="#f59e0b"
        onConfirm={handleFinancialRefund}
        onCancel={handleFinancialForfeit}
      />

      {/* === FINAL CONFIRM MODAL (STEP 3) === */}
      <ConfirmModal
        isOpen={finalConfirmModal.show}
        title="⚠️ Konfirmasi Akhir"
        message={
          <div style={{ textAlign: "left" }}>
            <p style={{ marginBottom: "12px", fontWeight: "bold" }}>
              Ringkasan Pembatalan:
            </p>
            <div
              style={{
                padding: "12px",
                background: "#fef2f2",
                borderRadius: "8px",
                border: "1px solid #fecaca",
                fontSize: "13px",
              }}
            >
              <p>
                <strong>Order:</strong> {order.orderNumber}
              </p>
              <p>
                <strong>Alasan:</strong> "{finalConfirmModal.reason}"
              </p>
              <p>
                <strong>Status Dana:</strong>{" "}
                {finalConfirmModal.financialAction === "REFUND"
                  ? "💸 Dikembalikan"
                  : finalConfirmModal.financialAction === "FORFEIT"
                    ? "🔥 Hangus"
                    : "- Tidak ada"}
              </p>
            </div>
          </div>
        }
        confirmText="Ya, Batalkan Order"
        cancelText="Tidak Jadi"
        confirmColor="#dc2626"
        onConfirm={executeCancelOrder}
        onCancel={() =>
          setFinalConfirmModal({
            show: false,
            reason: "",
            financialAction: "NONE",
          })
        }
      />

      {/* === WA NOTIFICATION MODAL === */}
      <WANotificationModal
        isOpen={waModal.show}
        order={order}
        actionType={waModal.actionType}
        onConfirmWithWA={handleWAConfirmWithNotification}
        onConfirmSilent={handleWASilentUpdate}
        onCancel={handleWACancel}
      />
    </div>
  );
}

OrderCard.propTypes = {
  order: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    orderNumber: PropTypes.string,
    customerName: PropTypes.string,
    customerPhone: PropTypes.string,
    source: PropTypes.string,
    productionStatus: PropTypes.string,
    paymentStatus: PropTypes.string,
    paidAmount: PropTypes.number,
    totalAmount: PropTypes.number,
    remainingAmount: PropTypes.number,
    isTempo: PropTypes.bool,
    createdAt: PropTypes.string,
    cancelReason: PropTypes.string,
    cancelledAt: PropTypes.string,
    items: PropTypes.arrayOf(
      PropTypes.shape({
        qty: PropTypes.number,
        productName: PropTypes.string,
        description: PropTypes.string,
        notes: PropTypes.string,
        meta: PropTypes.shape({
          detail_options: PropTypes.shape({
            custom_inputs: PropTypes.object,
          }),
        }),
      }),
    ),
    customerSnapshot: PropTypes.shape({
      whatsapp: PropTypes.string,
    }),
  }).isRequired,
};
