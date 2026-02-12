/**
 * src/modules/orders/OrderCard.jsx
 * OrderCard Component (ULTIMATE V4.1 - FIX DUPLICATE)
 * Features:
 * 1. Strict Workflow (Logic)
 * 2. Audit Log Viewer / CCTV
 * 3. Mini Timeline
 * 4. Visual Lock (Fixed)
 * 5. Operator Name Input
 */

import React, { useState } from "react";
import PropTypes from "prop-types";
import { useOrderStore } from "../../stores/useOrderStore";
import { usePermissions } from "../../hooks/usePermissions";
import { useAuthStore } from "../../stores/useAuthStore";
import { ORDER_STATUS } from "../../core/constants";
import { formatRupiah } from "../../core/formatters";
import { formatDateTime } from "../../utils/dateHelpers";
import { NotaPreview } from "../pos/NotaPreview";
import { ConfirmModal } from "../../components/ConfirmModal";
import { PromptModal } from "../../components/PromptModal";
import { WANotificationModal } from "../../components/WANotificationModal";
import { AuditLogModal } from "../../components/AuditLogModal";
import { CompletionModal } from "./CompletionModal";

export function OrderCard({ order }) {
  const { updateProductionStatus, addPayment, cancelOrder } = useOrderStore();
  const { user } = useAuthStore();
  const permissions = usePermissions();
  const canUpdateOrderStatus = permissions.canUpdateOrderStatus();
  const [updating, setUpdating] = useState(false);

  // Print Config State
  const [printConfig, setPrintConfig] = useState({
    show: false,
    type: "NOTA",
    autoPrint: false,
  });

  // === MODAL STATES ===
  // 1. Settlement (Uang)
  const [settlementModal, setSettlementModal] = useState({ show: false });
  const [settlementReceiver, setSettlementReceiver] = useState("");

  // 2. SPK (Operator Produksi)
  const [spkModal, setSpkModal] = useState({ show: false });
  const [spkOperator, setSpkOperator] = useState("");

  // 3. Cancel & Audit
  const [cancelReasonModal, setCancelReasonModal] = useState({ show: false });
  const [financialAuditModal, setFinancialAuditModal] = useState({
    show: false,
    reason: "",
  });
  const [finalConfirmModal, setFinalConfirmModal] = useState({
    show: false,
    reason: "",
    financialAction: "NONE",
  });
  const [waModal, setWaModal] = useState({ show: false, actionType: null });
  const [showAuditLog, setShowAuditLog] = useState(false);
  const [completionModal, setCompletionModal] = useState({ show: false });

  const statusConfig = ORDER_STATUS[order.productionStatus];

  // === LOGIKA VISUAL LOCK (FIXED) ===
  // Variabel isLunas dideklarasikan SATU KALI DISINI SAJA
  const isLunas = order.paymentStatus === "PAID";

  // Hanya kunci (arsip) jika: CANCELLED atau (Sudah DELIVERED DAN Sudah LUNAS)
  // Jika Tempo (Delivered tapi Belum Lunas), JANGAN DIKUNCI.
  const isArchived =
    order.productionStatus === "CANCELLED" ||
    (order.productionStatus === "DELIVERED" && isLunas);

  // === MAIN ACTION HANDLER ===
  const handleMainAction = async () => {
    if (!canUpdateOrderStatus) {
      alert("Anda tidak memiliki izin");
      return;
    }
    if (!mainAction) return;

    // A. SETTLEMENT
    if (
      mainAction.type === "PAYMENT_FIRST" ||
      mainAction.type === "repayment"
    ) {
      setSettlementReceiver("");
      setSettlementModal({ show: true });
      return;
    }

    // B. PRODUCTION: SPK
    if (mainAction.type === "PROCESS_SPK") {
      setSpkOperator("");
      setSpkModal({ show: true });
      return;
    }

    // C. PRODUCTION: READY / DELIVERED
    if (mainAction.type === "COMPLETE_ORDER") {
      setCompletionModal({ show: true });
      return;
    }
    if (
      mainAction.type === "HANDOVER_STANDARD" ||
      mainAction.type === "HANDOVER_VIP"
    ) {
      setWaModal({ show: true, actionType: "DELIVER" });
      return;
    }
  };

  // === EXECUTION HANDLERS ===
  const executeProcessSPK = async () => {
    const operatorName = spkOperator.trim() || "Operator";
    setSpkModal({ show: false });
    setUpdating(true);
    try {
      await updateProductionStatus(order.id, "IN_PROGRESS", operatorName);
      setTimeout(() => {
        setPrintConfig({ show: true, type: "SPK", autoPrint: true });
      }, 100);
    } catch (err) {
      alert("❌ Gagal: " + err.message);
    }
    setUpdating(false);
  };

  const executeSettlement = async () => {
    const sisa = order.remainingAmount || order.totalAmount - order.paidAmount;

    // 1. Siapkan Nama (Logika Anda sudah benar)
    const finalReceiver = settlementReceiver.trim() || "Admin Pelunasan";

    setSettlementModal({ show: false });
    setUpdating(true);
    try {
      // 2. KIRIM 'finalReceiver', BUKAN 'settlementReceiver'
      // 👇 (Disini letak kesalahan sebelumnya)
      await addPayment(order.id, sisa, finalReceiver);

      setPrintConfig({ show: true, type: "NOTA", autoPrint: true });
    } catch (err) {
      alert("❌ Gagal: " + err.message);
    }
    setUpdating(false);
  };

  const handleCompletionSubmit = async ({ orderId, status, evidence }) => {
    // Note: Modal will handle success step, we just process data here
    setUpdating(true);
    try {
      await updateProductionStatus(orderId, status, user?.name || "Operator", {
        marketing_evidence_url: evidence?.url,
        is_public_content: evidence?.isPublic,
      });
    } catch (err) {
      // Re-throw to let Modal handle UI error
      throw err;
    } finally {
      setUpdating(false);
    }
  };

  const handleWAConfirmWithNotification = async () => {
    setWaModal({ show: false, actionType: null });
    setUpdating(true);
    try {
      if (waModal.actionType === "COMPLETE") {
        await updateProductionStatus(order.id, "READY");
        alert("✅ Order SIAP + WA Terkirim");
      } else if (waModal.actionType === "DELIVER") {
        await updateProductionStatus(order.id, "DELIVERED");
        alert("✅ Order SELESAI + WA Terkirim");
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
        alert("✅ Order SIAP (Tanpa WA)");
      } else if (waModal.actionType === "DELIVER") {
        await updateProductionStatus(order.id, "DELIVERED");
        alert("✅ Order SELESAI (Tanpa WA)");
      }
    } catch (err) {
      alert("❌ Gagal: " + err.message);
    }
    setUpdating(false);
  };

  const handleWACancel = () => setWaModal({ show: false, actionType: null });

  const handleCancelOrder = () => {
    if (!order || !order.id) {
      alert("❌ ERROR SISTEM ID");
      return;
    }
    setCancelReasonModal({ show: true });
  };
  const handleReasonSubmitted = (reason) => {
    setCancelReasonModal({ show: false });
    const amountPaid = order.paidAmount || 0;
    if (amountPaid > 0) setFinancialAuditModal({ show: true, reason });
    else setFinalConfirmModal({ show: true, reason, financialAction: "NONE" });
  };
  const handleFinancialRefund = () => {
    const savedReason = financialAuditModal.reason;
    setFinancialAuditModal({ show: false, reason: "" });
    setFinalConfirmModal({
      show: true,
      reason: savedReason,
      financialAction: "REFUND",
    });
  };
  const handleFinancialForfeit = () => {
    const savedReason = financialAuditModal.reason;
    setFinancialAuditModal({ show: false, reason: "" });
    setFinalConfirmModal({
      show: true,
      reason: savedReason,
      financialAction: "FORFEIT",
    });
  };
  const executeCancelOrder = async () => {
    const { reason, financialAction } = finalConfirmModal;
    setFinalConfirmModal({ show: false, reason: "", financialAction: "NONE" });
    setUpdating(true);
    try {
      await cancelOrder(
        order.id,
        reason.trim(),
        financialAction,
        user?.name || "Operator",
      );
    } catch (error) {
      alert("❌ Gagal batal.");
    } finally {
      setUpdating(false);
    }
  };

  const handleReprint = () =>
    setPrintConfig({ show: true, type: "NOTA", autoPrint: false });

  // === SMART ACTION BUTTON ===
  const getMainAction = () => {
    // isLunas sudah dideklarasikan di atas, tidak perlu deklarasi ulang disini
    const isTempo = order.isTempo === true;
    const remaining =
      order.remainingAmount ?? order.totalAmount - (order.paidAmount || 0);
    const hasDebt = remaining > 0;

    switch (order.productionStatus) {
      case "PENDING":
        return {
          label: "🖨️ PROSES SPK",
          color: "#3b82f6",
          type: "PROCESS_SPK",
          disabled: false,
        };
      case "IN_PROGRESS":
        return {
          label: "✅ TANDAI SELESAI",
          color: "#22c55e",
          type: "COMPLETE_ORDER",
          disabled: false,
        };
      case "READY":
        if (isLunas)
          return {
            label: "📦 SERAHKAN",
            color: "#64748b",
            type: "HANDOVER_STANDARD",
            disabled: false,
          };
        else if (isTempo)
          return {
            label: "📦 SERAHKAN (VIP)",
            color: "#f59e0b",
            type: "HANDOVER_VIP",
            disabled: false,
          };
        else
          return {
            label: "💰 BAYAR & AMBIL",
            color: "#16a34a",
            type: "PAYMENT_FIRST",
            disabled: false,
          };
      case "DELIVERED":
        if (hasDebt)
          return {
            label: "💳 LUNASI TAGIHAN",
            color: "#16a34a",
            type: "repayment",
            disabled: false,
          };
        return null;
      default:
        return null;
    }
  };

  const mainAction = getMainAction();
  const canCancel =
    order.productionStatus !== "CANCELLED" &&
    order.productionStatus !== "DELIVERED";

  // === BAGIAN BADGE ===
  let paymentBadgeLabel = "🔴 BELUM BAYAR";
  if (isLunas)
    paymentBadgeLabel = "✅ LUNAS"; // Menggunakan isLunas dari deklarasi atas
  else if (order.paymentStatus === "PARTIAL") paymentBadgeLabel = "⏳ DP";

  // === MINI TIMELINE ===
  const getTimelineStep = () => {
    if (order.productionStatus === "CANCELLED") return -1;
    if (order.productionStatus === "DELIVERED") return 4;
    if (order.productionStatus === "READY") return 3;
    if (order.productionStatus === "IN_PROGRESS") return 2;
    if (order.paidAmount > 0 || order.paymentStatus === "PAID") return 1;
    return 0;
  };
  const step = getTimelineStep();

  return (
    <>
      <div
        style={{
          background: "#1f2937",
          borderRadius: "12px",
          padding: "16px",
          marginBottom: "16px",
          border: "1px solid #374151",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
          // LOGIKA KUNCI: Redupkan jika Arsip
          opacity: isArchived ? 0.85 : 1,
          filter: isArchived ? "grayscale(30%)" : "none",
          transition: "all 0.3s",
        }}
      >
        {/* HEADER */}
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
          <div>
            <div
              style={{
                fontSize: "18px",
                fontWeight: "900",
                color: "white",
                marginBottom: "4px",
              }}
            >
              <span title={order.source === "ONLINE" ? "Online" : "Kasir"}>
                {order.source === "ONLINE" ? "🌐" : "🏪"}
              </span>{" "}
              {order.orderNumber || `#${String(order.id).slice(0, 8)}`}
              <button
                onClick={() => setShowAuditLog(true)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  marginLeft: "8px",
                  fontSize: "16px",
                  padding: "2px",
                  borderRadius: "50%",
                }}
                title="Lihat Jejak Audit (CCTV)"
              >
                ℹ️
              </button>
            </div>
            <div
              style={{ fontSize: "14px", fontWeight: "600", color: "#9ca3af" }}
            >
              👤 {order.customerName}{" "}
              {order.customerPhone && (
                <span style={{ marginLeft: "10px", fontSize: "12px" }}>
                  📞 {order.customerPhone}
                </span>
              )}
            </div>
            {/* BADGES */}
            <div
              style={{
                marginTop: "8px",
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              {order.meta?.production_service?.priority && (
                <span
                  style={{
                    backgroundColor:
                      order.meta.production_service.priority === "URGENT"
                        ? "#ef4444"
                        : order.meta.production_service.priority === "EXPRESS"
                          ? "#f59e0b"
                          : "#3b82f6",
                    color: "white",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: "900",
                    border: "1px solid rgba(255,255,255,0.2)",
                  }}
                >
                  {order.meta.production_service.priority === "URGENT" && "🔥 "}
                  {order.meta.production_service.priority === "EXPRESS" &&
                    "⚡ "}
                  {order.meta.production_service.priority}
                </span>
              )}
              {order.meta?.production_service?.estimate_date && (
                <span
                  style={{
                    backgroundColor: "#374151",
                    color: "#fbbf24",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: "bold",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    border: "1px solid #4b5563",
                  }}
                >
                  🕒 DL:{" "}
                  {new Date(
                    order.meta.production_service.estimate_date,
                  ).toLocaleString("id-ID", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
          </div>

          {/* STATUS KANAN */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
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
              }}
              title="Cetak Ulang"
            >
              🖨️
            </button>
            <span
              style={{
                backgroundColor: isLunas ? "#16a34a" : "#dc2626",
                color: "white",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: "900",
                textTransform: "uppercase",
                boxShadow: isLunas
                  ? "0 0 10px rgba(22, 163, 74, 0.4)"
                  : "0 0 10px rgba(220, 38, 38, 0.4)",
              }}
            >
              {paymentBadgeLabel}
            </span>
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

        {/* BODY */}
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
          </div>
        )}

        {/* TIMELINE */}
        {order.productionStatus !== "CANCELLED" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "16px",
              background: "rgba(0,0,0,0.2)",
              padding: "8px",
              borderRadius: "8px",
            }}
          >
            {["Dibuat", "Bayar/DP", "Proses", "Siap", "Selesai"].map(
              (label, idx) => (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    position: "relative",
                  }}
                >
                  {idx < 4 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "8px",
                        left: "50%",
                        width: "100%",
                        height: "2px",
                        background: idx < step ? "#22c55e" : "#4b5563",
                        zIndex: 0,
                      }}
                    />
                  )}
                  <div
                    style={{
                      width: "16px",
                      height: "16px",
                      borderRadius: "50%",
                      zIndex: 1,
                      marginBottom: "4px",
                      backgroundColor: idx <= step ? "#22c55e" : "#374151",
                      border:
                        idx <= step ? "2px solid #22c55e" : "2px solid #4b5563",
                      boxShadow: idx === step ? "0 0 8px #22c55e" : "none",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "9px",
                      color: idx <= step ? "#d1d5db" : "#6b7280",
                      fontWeight: idx === step ? "bold" : "normal",
                    }}
                  >
                    {label}
                  </span>
                </div>
              ),
            )}
          </div>
        )}

        {/* ITEMS */}
        <div
          style={{
            background: "#111827",
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
              {item.notes && (
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#fbbf24",
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
                    }}
                  >
                    🔧 DETAIL PRODUKSI:
                  </div>
                  {Object.entries(item.meta.detail_options.custom_inputs).map(
                    ([key, value]) => (
                      <div
                        key={key}
                        style={{ color: "#e5e7eb", marginBottom: "3px" }}
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

        {/* FOOTER */}
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
            style={{ fontSize: "13px", fontWeight: "700", color: "#9ca3af" }}
          >
            Total
          </span>
          <span style={{ fontSize: "15px", fontWeight: "900", color: "white" }}>
            {formatRupiah(order.totalAmount)}
          </span>
        </div>
        <div
          style={{ fontSize: "11px", color: "#6b7280", marginBottom: "12px" }}
        >
          📅 {formatDateTime(order.createdAt)}
        </div>

        {/* ACTION BUTTONS (Logic: HIDE if Archived) */}
        {!isArchived && order.productionStatus !== "CANCELLED" && (
          <div style={{ display: "flex", gap: "10px" }}>
            {mainAction && canUpdateOrderStatus && (
              <button
                onClick={handleMainAction}
                disabled={updating || mainAction.disabled}
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
                  boxShadow: !mainAction.disabled
                    ? "0 4px 12px rgba(0,0,0,0.3)"
                    : "none",
                  transition: "all 0.2s",
                }}
              >
                {updating ? "⏳..." : mainAction.label}{" "}
                {mainAction.disabled && " 🔒"}
              </button>
            )}
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
                title="Batalkan"
              >
                🚫 BATAL
              </button>
            )}
          </div>
        )}

        {/* === MODALS === */}
        {printConfig.show && (
          <NotaPreview
            items={order.items}
            totalAmount={order.totalAmount}
            paymentState={{
              amountPaid: order.paidAmount,
              mode: order.paymentStatus === "PAID" ? "LUNAS" : "PARTIAL",
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
        <ConfirmModal
          isOpen={spkModal.show}
          title="🖨️ Proses Produksi (SPK)"
          message={
            <div>
              <p style={{ marginBottom: "12px", color: "#4b5563" }}>
                Order akan ditandai <strong>IN PROGRESS</strong> dan SPK akan
                dicetak.
              </p>
              <div style={{ marginTop: "16px", textAlign: "left" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: "bold",
                    marginBottom: "4px",
                    color: "#374151",
                  }}
                >
                  Operator / Penanggung Jawab:
                </label>
                <input
                  type="text"
                  placeholder="Cth: Budi, Asep, dll..."
                  value={spkOperator}
                  onChange={(e) => setSpkOperator(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #93c5fd",
                    borderRadius: "6px",
                    fontSize: "14px",
                    outlineColor: "#3b82f6",
                  }}
                  autoFocus
                />
              </div>
            </div>
          }
          confirmText="🚀 Proses Sekarang"
          cancelText="Batal"
          confirmColor="#3b82f6"
          onConfirm={executeProcessSPK}
          onCancel={() => setSpkModal({ show: false })}
        />
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
        <ConfirmModal
          isOpen={financialAuditModal.show}
          title="⚠️ Uangnya Mau Diapakan?"
          message={
            <div>
              <p style={{ marginBottom: "12px" }}>
                Order ini sudah ada uang masuk:
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
                Karena batal, uang ini mau:
              </p>
            </div>
          }
          confirmText="💸 Kembalikan ke Pelanggan"
          cancelText="🔒 Masuk Kas Toko (Hangus)"
          confirmColor="#f59e0b"
          onConfirm={handleFinancialRefund}
          onCancel={handleFinancialForfeit}
        />
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
        <CompletionModal
          isOpen={completionModal.show}
          order={order}
          onClose={() => setCompletionModal({ show: false })}
          onSubmit={handleCompletionSubmit}
          isOffline={!navigator.onLine}
        />
        <WANotificationModal
          isOpen={waModal.show}
          order={order}
          actionType={waModal.actionType}
          onConfirmWithWA={handleWAConfirmWithNotification}
          onConfirmSilent={handleWASilentUpdate}
          onCancel={handleWACancel}
        />
        <AuditLogModal
          isOpen={showAuditLog}
          onClose={() => setShowAuditLog(false)}
          orderId={order.id}
          orderNumber={order.orderNumber || String(order.id)}
        />
      </div>
    </>
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
        meta: PropTypes.object,
      }),
    ),
    meta: PropTypes.object,
    customerSnapshot: PropTypes.object,
  }).isRequired,
};
