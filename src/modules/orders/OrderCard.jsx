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

import React, { useState, useEffect } from "react";
import { useOrderStore } from "../../stores/useOrderStore";
import PropTypes from "prop-types";
import { usePermissions } from "../../hooks/usePermissions";
import { ORDER_STATUS } from "../../core/constants";
import { formatRupiah } from "../../core/formatters";
import { formatDateTime } from "../../utils/dateHelpers";
// Modals have been elevated to OrderBoard.jsx

const formatPhoneForWA = (phone) => {
  if (!phone) return "";
  let cleanPhone = phone.replace(/\D/g, "");
  if (cleanPhone.startsWith("0")) {
    cleanPhone = "62" + cleanPhone.substring(1);
  }
  return cleanPhone;
};

export const OrderCard = React.memo(function OrderCard({ order, onOpenModal }) {
  const { archiveOrder } = useOrderStore();
  const permissions = usePermissions();
  const canUpdateOrderStatus = permissions.canUpdateOrderStatus();

  // === MODAL STATES ===
  // All Modals Elevated to OrderBoard.jsx

  // [NEW] Context Menu State
  const [contextMenu, setContextMenu] = useState(null);

  const handleContextMenu = (e) => {
    // Only for backlog items
    if (!order.isBacklog) return;

    e.preventDefault();
    setContextMenu({
      mouseX: e.clientX,
      mouseY: e.clientY,
    });
  };

  const handleArchive = () => {
    setContextMenu(null);
    if (
      window.confirm(
        "Yakin ingin mengarsipkan order ini? Order akan hilang dari list.",
      )
    ) {
      archiveOrder(order.id);
    }
  };

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    document.addEventListener("click", closeMenu);
    return () => document.removeEventListener("click", closeMenu);
  }, []);

  const statusConfig = ORDER_STATUS[order.productionStatus];

  // === LOGIKA VISUAL LOCK (FIXED) ===
  // Variabel isLunas dideklarasikan SATU KALI DISINI SAJA
  const isLunas = order.paymentStatus === "PAID";
  const isSelesai = order.productionStatus === "DELIVERED";

  // Hanya kunci (arsip) jika: CANCELLED atau (Sudah DELIVERED DAN Sudah LUNAS)
  // Jika Tempo (Delivered tapi Belum Lunas), JANGAN DIKUNCI.
  const isLocked =
    order.productionStatus === "CANCELLED" || (isSelesai && isLunas);

  // === MAIN ACTION HANDLER ===
  const handleMainAction = async (action) => {
    if (!canUpdateOrderStatus) {
      alert("Anda tidak memiliki izin");
      return;
    }
    if (!action) return;

    // A. SETTLEMENT
    if (action.type === "PAYMENT_FIRST" || action.type === "repayment") {
      onOpenModal("PAYMENT", order);
      return;
    }

    // B. PRODUCTION: SPK
    if (action.type === "PROCESS_SPK") {
      onOpenModal("SPK", order);
      return;
    }

    // C. PRODUCTION: READY / DELIVERED
    if (action.type === "COMPLETE_ORDER") {
      onOpenModal("COMPLETION", order);
      return;
    }
    if (
      action.type === "HANDOVER_STANDARD" ||
      action.type === "HANDOVER_VIP"
    ) {
      onOpenModal("WA", order, { waAction: "DELIVER" });
      return;
    }
  };

  const handlePaymentClick = () => {
    onOpenModal("PAYMENT", order);
  };


  const handleCancelOrder = () => {
    onOpenModal("CANCEL_REASON", order);
  };

  // handleReasonSubmitted, handleFinancialRefund, handleFinancialForfeit, executeCancelOrder [ELEVATED TO OrderBoard.jsx]

  const handleReprint = () =>
    onOpenModal("NOTA", order, { printType: "NOTA", autoPrint: false });

  // === SMART ORTHOGONAL ACTIONS ===
  const getProductionAction = () => {
    const isTempo = order.isTempo === true;

    switch (order.productionStatus) {
      case "PENDING":
        return {
          label: "🖨️ PROSES SPK",
          color: "#3b82f6",
          type: "PROCESS_SPK",
        };
      case "IN_PROGRESS":
        return {
          label: "✅ TANDAI SELESAI",
          color: "#22c55e",
          type: "COMPLETE_ORDER",
        };
      case "READY":
        if (isLunas) {
          return {
            label: "📦 SERAHKAN",
            color: "#64748b",
            type: "HANDOVER_STANDARD",
          };
        } else if (isTempo) {
          return {
            label: "📦 SERAHKAN (VIP)",
            color: "#f59e0b",
            type: "HANDOVER_VIP",
          };
        } else {
          // Orthogonal requirement: Ready -> SERAHKAN / SERAHKAN VIP
          // If not tempo and not lunas, usually handover_standard with payment first.
          // But here we split the payment button.
          return {
            label: "📦 SERAHKAN",
            color: "#64748b",
            type: "HANDOVER_STANDARD",
            disabled: !isLunas && !isTempo, // Tetap di-lock sampai ada pelunasan (kecuali Tempo)
          };
        }
      case "DELIVERED":
        return null; // Aksi produksi berhenti di Delivered
      default:
        return null;
    }
  };

  const getPaymentAction = () => {
    const remaining =
      order.remainingAmount ?? order.totalAmount - (order.paidAmount || 0);
    const hasDebt = remaining > 0;
    const isCancelled = order.productionStatus === "CANCELLED";

    if (hasDebt && !isCancelled) {
      return {
        label: "💳 LUNASI",
        color: "#16a34a",
        type: "PAYMENT",
      };
    }
    return null;
  };

  const productionAction = getProductionAction();
  const paymentAction = getPaymentAction();

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

  // === ANIMATION LOGIC (COSMETIC) ===
  let animationClass = "";
  if (order.productionStatus === "PENDING") {
    animationClass = "animate-pulse-red";
  } else if (order.productionStatus === "IN_PROGRESS" && !isSelesai) {
    animationClass = "animate-rotate-green"; // Walking light
  }

  return (
    <>
      <div
        className={`order-card ${animationClass}`}
        style={{
          background: "#1f2937",
          borderRadius: "12px",
          padding: "12px", // COMPACT: Reduced from 16px
          marginBottom: "12px", // COMPACT: Reduced from 16px
          border: "1px solid #374151",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
          // LOGIKA KUNCI: Redupkan jika Arsip
          opacity: isLocked ? 0.85 : 1,
          filter: isLocked ? "grayscale(30%)" : "none",
          transition: "all 0.3s",
          cursor: order.isBacklog ? "context-menu" : "default",
        }}
        onContextMenu={handleContextMenu}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "10px", // COMPACT: Reduced from 16px
            paddingBottom: "8px", // COMPACT: Reduced from 12px
            borderBottom: "2px solid #374151",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "16px", // COMPACT
                fontWeight: "900",
                color: "white",
                marginBottom: "2px", // COMPACT
              }}
            >
              <span title={order.source === "ONLINE" ? "Online" : "Kasir"}>
                {order.source === "ONLINE" ? "🌐" : "🏪"}
              </span>{" "}
              {order.orderNumber || `#${String(order.id).slice(0, 8)}`}
              <button
                onClick={() => onOpenModal("AUDIT", order)}
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
                  📞{" "}
                  <a
                    href={`https://wa.me/${formatPhoneForWA(order.customerPhone)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-green-500 hover:underline cursor-pointer transition-colors"
                  >
                    {order.customerPhone}
                  </a>
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
              {/* [NEW] BACKLOG BADGE */}
              {order.isBacklog && (
                <span
                  style={{
                    backgroundColor: "#450a0a",
                    color: "#fecaca",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: "900",
                    border: "1px solid #ef4444",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    boxShadow: "0 0 10px rgba(239, 68, 68, 0.2)",
                  }}
                >
                  ⚠️ BACKLOG
                </span>
              )}
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
                padding: "4px 8px", // COMPACT
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
                padding: "4px 8px", // COMPACT
                borderRadius: "6px",
                fontSize: "10px", // COMPACT
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
                padding: "4px 8px", // COMPACT
                borderRadius: "6px",
                fontSize: "10px", // COMPACT
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
              marginBottom: "12px",
              background: "rgba(0,0,0,0.2)",
              padding: "6px", // COMPACT
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
            padding: "10px", // COMPACT
            borderRadius: "8px",
            marginBottom: "10px", // COMPACT
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
                  fontSize: "14px", // COMPACT
                  fontWeight: "700",
                  color: "white",
                  marginBottom: "4px",
                }}
              >
                x{item.qty} {item.productName}
              </div>
              {item.specs?.summary && (
                <div className="text-xs text-slate-400 mt-0.5">
                  {item.specs.summary}
                </div>
              )}
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
        {!isLocked && order.productionStatus !== "CANCELLED" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              width: "100%",
            }}
          >
            {/* Baris 1 (Atas): Aksi Produksi (Full Width) */}
            {productionAction && canUpdateOrderStatus && (
              <button
                onClick={() => handleMainAction(productionAction)}
                disabled={productionAction.disabled}
                style={{
                  width: "100%",
                  padding: "12px",
                  backgroundColor: productionAction.color,
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "900",
                  cursor: productionAction.disabled ? "not-allowed" : "pointer",
                  fontSize: "14px",
                  opacity: productionAction.disabled ? 0.5 : 1,
                  textTransform: "uppercase",
                  boxShadow: !productionAction.disabled
                    ? "0 4px 12px rgba(0,0,0,0.3)"
                    : "none",
                  transition: "all 0.2s",
                }}
              >
                {productionAction.label}{" "}
                {productionAction.disabled && " 🔒"}
              </button>
            )}

            {/* Baris 2 (Bawah): Aksi Pembayaran & Batal (GRID 50:50) */}
            <div style={{ display: "flex", gap: "8px" }}>
              {paymentAction && canUpdateOrderStatus && (
                <button
                  onClick={handlePaymentClick}
                  style={{
                    flex: 1,
                    padding: "12px",
                    backgroundColor: paymentAction.color,
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: "900",
                    cursor: "pointer",
                    fontSize: "13px",
                    opacity: 1,
                    transition: "all 0.2s",
                    textTransform: "uppercase",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.2)",
                  }}
                >
                  {paymentAction.label}
                </button>
              )}

              {canCancel && canUpdateOrderStatus && (
                <button
                  onClick={handleCancelOrder}
                  style={{
                    flex: 1,
                    padding: "12px",
                    backgroundColor: "transparent",
                    color: "#ef4444",
                    border: "2px solid #ef4444",
                    borderRadius: "8px",
                    fontWeight: "800",
                    cursor: "pointer",
                    fontSize: "12px",
                    opacity: 1,
                    transition: "all 0.2s",
                    textTransform: "uppercase",
                  }}
                  title="Batalkan"
                >
                  🚫 BATAL
                </button>
              )}
            </div>
          </div>
        )}

        {/* [PHASE 4] AuditLog, NotaPreview, and WANotification Modals moved to OrderBoard.jsx */}
        {/* [PHASE 3] SPK and Cancellation Modals moved to OrderBoard.jsx */}
        {/* [PHASE 2] SettlementModal moved to OrderBoard.jsx */}
        {/* [PHASE 1] CompletionModal moved to OrderBoard.jsx */}
      </div>
      {/* CONTEXT MENU */}
      {contextMenu && (
        <div
          style={{
            position: "fixed",
            top: contextMenu.mouseY,
            left: contextMenu.mouseX,
            zIndex: 9999,
            background: "#1f2937",
            border: "1px solid #374151",
            borderRadius: "8px",
            padding: "8px",
            boxShadow: "0 4px 6px rgba(0,0,0,0.5)",
            minWidth: "150px",
          }}
        >
          <div className="text-xs text-gray-400 mb-2 px-2">Actions</div>
          <button
            onClick={handleArchive}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "8px",
              background: "#7f1d1d",
              color: "#fca5a5",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            🗑️ Arsipkan
          </button>
        </div>
      )}
    </>
  );
});

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
