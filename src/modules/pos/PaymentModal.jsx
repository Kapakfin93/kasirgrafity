/* eslint-disable react/prop-types */
import React, { useEffect, useRef } from "react";
import { formatRupiah } from "../../core/formatters";
import { PRIORITY_CONFIG } from "../../hooks/useTransaction";

/**
 * PaymentModal - Terminal Pembayaran (Indonesian Localized)
 * Wall Street Theme with Order Preview Safety Feature
 */
export function PaymentModal({
  isOpen,
  onClose,
  totalAmount,
  onConfirmPayment,
  discount,
  setDiscount,
  paymentState,
  updatePayment,
  customerName,
  targetDate,
  setTargetDate,
  setPriorityStandard,
  setPriorityExpress,
  setPriorityUrgent,
  isTempo,
  setIsTempo,
  items = [], // NEW: For order preview
}) {
  const inputRef = useRef(null);

  const subtotal =
    typeof totalAmount === "object" ? totalAmount.subtotal : totalAmount || 0;
  const appliedDiscount =
    typeof totalAmount === "object" ? totalAmount.discount : 0;
  const finalAmount =
    typeof totalAmount === "object"
      ? totalAmount.finalAmount
      : totalAmount || 0;

  const { mode, amountPaid } = paymentState || {};
  const paid = parseFloat(amountPaid) || 0;
  const change = Math.max(0, paid - finalAmount);
  const sisaBayar = Math.max(0, finalAmount - paid);

  const discountPercent = subtotal > 0 ? (discount / subtotal) * 100 : 0;
  const isHighDiscount = discountPercent > 50;

  const isTunai = mode === "TUNAI";
  const canProceed = isTempo || paid >= finalAmount;

  useEffect(() => {
    if (isOpen && inputRef.current && isTunai) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, isTunai]);

  const formatDisplayNumber = (value) => {
    if (!value) return "";
    return Number(value).toLocaleString("id-ID");
  };

  const handleAmountChange = (e) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    updatePayment({ amountPaid: rawValue });
  };

  const setQuickAmount = (amount) => {
    updatePayment({ amountPaid: String(amount) });
  };

  // Format date to Indonesian locale
  const formatIndonesianDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const dayName = date.toLocaleDateString("id-ID", { weekday: "long" });
    const day = date.getDate();
    const month = date.toLocaleDateString("id-ID", { month: "short" });
    const year = date.getFullYear();
    const time = date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return `${dayName}, ${day} ${month} ${year} • ${time} WIB`;
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(2, 6, 23, 0.95)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        backdropFilter: "blur(8px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
          borderRadius: "16px",
          width: "95%",
          maxWidth: "920px",
          maxHeight: "90vh",
          overflow: "hidden",
          boxShadow:
            "0 0 60px rgba(16, 185, 129, 0.15), 0 25px 50px -12px rgba(0, 0, 0, 0.8)",
          border: "1px solid #334155",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid #334155",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "rgba(15, 23, 42, 0.8)",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: "800",
                color: "#f1f5f9",
                letterSpacing: "0.1em",
              }}
            >
              💳 TERMINAL PEMBAYARAN
            </h2>
            {customerName && (
              <p
                style={{
                  margin: "4px 0 0",
                  color: "#64748b",
                  fontSize: "12px",
                }}
              >
                Pelanggan:{" "}
                <strong style={{ color: "#10b981" }}>{customerName}</strong>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#ef4444",
              fontSize: "20px",
              cursor: "pointer",
              padding: "6px 12px",
              borderRadius: "8px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Body - 2 Columns */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            maxHeight: "calc(90vh - 140px)",
            overflow: "hidden",
          }}
        >
          {/* LEFT: Summary & Adjustments */}
          <div
            style={{
              padding: "20px",
              borderRight: "1px solid #334155",
              overflowY: "auto",
            }}
          >
            {/* Grand Total Display */}
            <div
              style={{
                textAlign: "center",
                marginBottom: "16px",
                padding: "20px",
                background:
                  "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%)",
                borderRadius: "12px",
                border: "1px solid rgba(16, 185, 129, 0.2)",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "#64748b",
                  fontSize: "10px",
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                }}
              >
                TOTAL TAGIHAN
              </p>
              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: "42px",
                  fontWeight: "900",
                  color: "#10b981",
                  fontFamily: "monospace",
                  textShadow: "0 0 40px rgba(16, 185, 129, 0.4)",
                }}
              >
                {formatRupiah(finalAmount)}
              </p>
              {appliedDiscount > 0 && (
                <p
                  style={{
                    margin: "6px 0 0",
                    color: "#f43f5e",
                    fontSize: "11px",
                  }}
                >
                  <s style={{ color: "#475569" }}>{formatRupiah(subtotal)}</s>{" "}
                  (-{formatRupiah(appliedDiscount)})
                </p>
              )}
            </div>

            {/* ORDER PREVIEW - Safety Feature */}
            {items.length > 0 && (
              <div
                style={{
                  marginBottom: "16px",
                  padding: "12px",
                  background: "rgba(30, 41, 59, 0.5)",
                  borderRadius: "10px",
                  border: "1px solid #334155",
                }}
              >
                <p
                  style={{
                    margin: "0 0 8px",
                    color: "#64748b",
                    fontSize: "10px",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    fontWeight: "700",
                  }}
                >
                  📋 Rincian Pesanan ({items.length} item)
                </p>
                <div style={{ maxHeight: "100px", overflowY: "auto" }}>
                  {items.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "4px 0",
                        borderBottom:
                          idx < items.length - 1 ? "1px solid #334155" : "none",
                      }}
                    >
                      <span
                        style={{
                          color: "#e2e8f0",
                          fontSize: "11px",
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.productName || item.name}{" "}
                        <span style={{ color: "#64748b" }}>(×{item.qty})</span>
                      </span>
                      <span
                        style={{
                          color: "#10b981",
                          fontSize: "11px",
                          fontWeight: "600",
                          fontFamily: "monospace",
                          marginLeft: "8px",
                        }}
                      >
                        {formatRupiah(item.totalPrice)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Manual Discount Input - Gold/Yellow */}
            <div
              style={{
                padding: "14px",
                background: "rgba(251, 191, 36, 0.08)",
                borderRadius: "10px",
                border: "1px solid rgba(251, 191, 36, 0.3)",
                marginBottom: "14px",
              }}
            >
              <label
                style={{
                  display: "block",
                  fontSize: "10px",
                  fontWeight: "700",
                  color: "#fbbf24",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "6px",
                }}
              >
                🎟️ Diskon / Potongan (Rp)
              </label>
              <input
                type="number"
                min="0"
                max={subtotal}
                value={discount === 0 ? "" : discount}
                onChange={(e) => {
                  const val = Number(e.target.value) || 0;
                  setDiscount(Math.min(val, subtotal));
                }}
                style={{
                  width: "100%",
                  fontSize: "18px",
                  fontWeight: "800",
                  textAlign: "right",
                  color: "#fbbf24",
                  padding: "10px",
                  borderRadius: "8px",
                  border: isHighDiscount
                    ? "2px solid #f43f5e"
                    : "1px solid rgba(251, 191, 36, 0.4)",
                  background: "rgba(15, 23, 42, 0.8)",
                  outline: "none",
                  fontFamily: "monospace",
                }}
                placeholder="0"
                onFocus={(e) => e.target.select()}
              />
              {isHighDiscount && (
                <div
                  style={{
                    marginTop: "6px",
                    padding: "6px",
                    background: "rgba(244, 63, 94, 0.15)",
                    borderRadius: "6px",
                    border: "1px solid rgba(244, 63, 94, 0.4)",
                    fontSize: "10px",
                    color: "#f43f5e",
                    fontWeight: "700",
                  }}
                >
                  ⚠️ Diskon tinggi: {discountPercent.toFixed(0)}%
                </div>
              )}
            </div>

            {/* Deadline Picker */}
            {targetDate && setTargetDate && (
              <div
                style={{
                  padding: "14px",
                  background: "rgba(30, 41, 59, 0.5)",
                  borderRadius: "10px",
                  border: "1px solid #334155",
                }}
              >
                <label
                  style={{
                    display: "block",
                    fontSize: "10px",
                    fontWeight: "700",
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    marginBottom: "8px",
                  }}
                >
                  ⏰ Estimasi Selesai
                </label>
                <div
                  style={{ display: "flex", gap: "6px", marginBottom: "8px" }}
                >
                  <button
                    onClick={setPriorityStandard}
                    style={{
                      flex: 1,
                      padding: "7px",
                      borderRadius: "6px",
                      border: "1px solid #10b981",
                      background: "transparent",
                      color: "#10b981",
                      fontSize: "9px",
                      fontWeight: "700",
                      cursor: "pointer",
                    }}
                  >
                    STANDAR
                  </button>
                  <button
                    onClick={setPriorityExpress}
                    style={{
                      flex: 1,
                      padding: "7px",
                      borderRadius: "6px",
                      border: "1px solid #f59e0b",
                      background: "transparent",
                      color: "#f59e0b",
                      fontSize: "9px",
                      fontWeight: "700",
                      cursor: "pointer",
                    }}
                  >
                    +
                    {formatRupiah(PRIORITY_CONFIG.FEE_EXPRESS).replace(
                      "Rp ",
                      "",
                    )}
                  </button>
                  <button
                    onClick={setPriorityUrgent}
                    style={{
                      flex: 1,
                      padding: "7px",
                      borderRadius: "6px",
                      border: "1px solid #f43f5e",
                      background: "transparent",
                      color: "#f43f5e",
                      fontSize: "9px",
                      fontWeight: "700",
                      cursor: "pointer",
                    }}
                  >
                    +
                    {formatRupiah(PRIORITY_CONFIG.FEE_URGENT).replace(
                      "Rp ",
                      "",
                    )}
                  </button>
                </div>
                <input
                  type="datetime-local"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px",
                    borderRadius: "6px",
                    border: "1px solid #475569",
                    background: "rgba(15, 23, 42, 0.8)",
                    color: "#f1f5f9",
                    fontSize: "11px",
                  }}
                />
                {targetDate && (
                  <p
                    style={{
                      margin: "6px 0 0",
                      color: "#94a3b8",
                      fontSize: "10px",
                    }}
                  >
                    📅 {formatIndonesianDate(targetDate)}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: Payment Execution */}
          <div style={{ padding: "20px", overflowY: "auto" }}>
            {/* Payment Mode Tabs */}
            <div
              style={{
                display: "flex",
                background: "#0f172a",
                borderRadius: "10px",
                padding: "4px",
                marginBottom: "16px",
                border: "1px solid #334155",
              }}
            >
              <button
                onClick={() => {
                  updatePayment({ mode: "TUNAI" });
                  setIsTempo(false);
                }}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "8px",
                  border: "none",
                  background:
                    mode === "TUNAI" && !isTempo
                      ? "linear-gradient(135deg, #059669 0%, #10b981 100%)"
                      : "transparent",
                  color: mode === "TUNAI" && !isTempo ? "#022c22" : "#64748b",
                  fontWeight: "800",
                  fontSize: "11px",
                  cursor: "pointer",
                  boxShadow:
                    mode === "TUNAI" && !isTempo
                      ? "0 0 20px rgba(16, 185, 129, 0.4)"
                      : "none",
                }}
              >
                💵 TUNAI
              </button>
              <button
                onClick={() => {
                  updatePayment({ mode: "NON_TUNAI" });
                  setIsTempo(false);
                }}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "8px",
                  border: "none",
                  background:
                    mode === "NON_TUNAI" && !isTempo
                      ? "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)"
                      : "transparent",
                  color: mode === "NON_TUNAI" && !isTempo ? "white" : "#64748b",
                  fontWeight: "800",
                  fontSize: "11px",
                  cursor: "pointer",
                  boxShadow:
                    mode === "NON_TUNAI" && !isTempo
                      ? "0 0 20px rgba(59, 130, 246, 0.4)"
                      : "none",
                }}
              >
                📱 TRANSFER
              </button>
              <button
                onClick={() => setIsTempo(true)}
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "8px",
                  border: "none",
                  background: isTempo
                    ? "linear-gradient(135deg, #be123c 0%, #f43f5e 100%)"
                    : "transparent",
                  color: isTempo ? "white" : "#64748b",
                  fontWeight: "800",
                  fontSize: "11px",
                  cursor: "pointer",
                  boxShadow: isTempo
                    ? "0 0 20px rgba(244, 63, 94, 0.4)"
                    : "none",
                }}
              >
                ⚠️ TEMPO
              </button>
            </div>

            {/* Amount Input (TUNAI/TRANSFER) */}
            {!isTempo && (
              <>
                <label
                  style={{
                    display: "block",
                    fontSize: "10px",
                    fontWeight: "700",
                    color: "#64748b",
                    marginBottom: "6px",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  Uang Diterima
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={formatDisplayNumber(amountPaid)}
                  onChange={handleAmountChange}
                  onFocus={(e) => e.target.select()}
                  placeholder="0"
                  style={{
                    width: "100%",
                    padding: "14px",
                    fontSize: "28px",
                    fontWeight: "900",
                    textAlign: "right",
                    color: paid >= finalAmount ? "#10b981" : "#fbbf24",
                    background: "#0f172a",
                    border:
                      paid >= finalAmount
                        ? "2px solid #10b981"
                        : "1px solid #475569",
                    borderRadius: "10px",
                    outline: "none",
                    fontFamily: "monospace",
                    boxShadow:
                      paid >= finalAmount
                        ? "0 0 20px rgba(16, 185, 129, 0.2)"
                        : "none",
                  }}
                />

                {/* Quick Shortcuts */}
                <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
                  <button
                    onClick={() => setQuickAmount(finalAmount)}
                    style={{
                      flex: 1,
                      padding: "8px",
                      borderRadius: "6px",
                      border: "1px solid #10b981",
                      background: "rgba(16, 185, 129, 0.1)",
                      color: "#10b981",
                      fontWeight: "700",
                      fontSize: "10px",
                      cursor: "pointer",
                    }}
                  >
                    UANG PAS
                  </button>
                  <button
                    onClick={() => setQuickAmount(50000)}
                    style={{
                      flex: 1,
                      padding: "8px",
                      borderRadius: "6px",
                      border: "1px solid #475569",
                      background: "transparent",
                      color: "#94a3b8",
                      fontWeight: "600",
                      fontSize: "10px",
                      cursor: "pointer",
                    }}
                  >
                    50.000
                  </button>
                  <button
                    onClick={() => setQuickAmount(100000)}
                    style={{
                      flex: 1,
                      padding: "8px",
                      borderRadius: "6px",
                      border: "1px solid #475569",
                      background: "transparent",
                      color: "#94a3b8",
                      fontWeight: "600",
                      fontSize: "10px",
                      cursor: "pointer",
                    }}
                  >
                    100.000
                  </button>
                </div>

                {/* Change Display */}
                <div
                  style={{
                    marginTop: "14px",
                    padding: "14px",
                    borderRadius: "10px",
                    background:
                      paid >= finalAmount
                        ? "rgba(16, 185, 129, 0.1)"
                        : "rgba(244, 63, 94, 0.1)",
                    border:
                      paid >= finalAmount
                        ? "1px solid rgba(16, 185, 129, 0.3)"
                        : "1px solid rgba(244, 63, 94, 0.3)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        color: "#64748b",
                        fontSize: "10px",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                      }}
                    >
                      {paid >= finalAmount ? "KEMBALIAN" : "SISA TAGIHAN"}
                    </span>
                    <span
                      style={{
                        fontSize: "24px",
                        fontWeight: "900",
                        color: paid >= finalAmount ? "#10b981" : "#f43f5e",
                        fontFamily: "monospace",
                        textShadow:
                          paid >= finalAmount
                            ? "0 0 20px rgba(16, 185, 129, 0.4)"
                            : "0 0 20px rgba(244, 63, 94, 0.4)",
                      }}
                    >
                      {formatRupiah(paid >= finalAmount ? change : sisaBayar)}
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* TEMPO Mode Warning */}
            {isTempo && (
              <div
                style={{
                  padding: "20px",
                  background:
                    "linear-gradient(135deg, rgba(190, 18, 60, 0.1) 0%, rgba(244, 63, 94, 0.05) 100%)",
                  borderRadius: "12px",
                  border: "1px solid rgba(244, 63, 94, 0.3)",
                  textAlign: "center",
                }}
              >
                <p style={{ margin: 0, fontSize: "40px" }}>⚠️</p>
                <h3
                  style={{
                    margin: "10px 0 6px",
                    color: "#f43f5e",
                    fontSize: "15px",
                    fontWeight: "900",
                    letterSpacing: "0.1em",
                  }}
                >
                  MODE TEMPO / HUTANG
                </h3>
                <p style={{ margin: 0, color: "#94a3b8", fontSize: "11px" }}>
                  Pesanan akan diproses tanpa pembayaran. Faktur akan dicetak.
                </p>
                <div
                  style={{
                    marginTop: "12px",
                    padding: "10px",
                    background: "rgba(251, 191, 36, 0.1)",
                    borderRadius: "8px",
                    border: "1px solid rgba(251, 191, 36, 0.3)",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      color: "#fbbf24",
                      fontSize: "10px",
                      fontWeight: "700",
                    }}
                  >
                    Sisa Tagihan:{" "}
                    <strong style={{ color: "#f43f5e", fontSize: "13px" }}>
                      {formatRupiah(finalAmount)}
                    </strong>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer - Confirm Button */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid #334155",
            background: "rgba(15, 23, 42, 0.8)",
          }}
        >
          <button
            onClick={onConfirmPayment}
            disabled={!canProceed}
            style={{
              width: "100%",
              padding: "16px",
              borderRadius: "10px",
              border: "none",
              background: canProceed
                ? isTempo
                  ? "linear-gradient(135deg, #be123c 0%, #f43f5e 100%)"
                  : "linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)"
                : "#475569",
              color: canProceed ? (isTempo ? "white" : "#022c22") : "#94a3b8",
              fontSize: "15px",
              fontWeight: "900",
              letterSpacing: "0.1em",
              cursor: canProceed ? "pointer" : "not-allowed",
              boxShadow: canProceed
                ? isTempo
                  ? "0 0 30px rgba(244, 63, 94, 0.4)"
                  : "0 0 30px rgba(16, 185, 129, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)"
                : "none",
              transition: "all 0.3s",
            }}
          >
            {isTempo
              ? "⚠️ SIMPAN SEBAGAI HUTANG"
              : paid >= finalAmount
                ? "✅ PROSES & CETAK"
                : `⏳ KURANG BAYAR: ${formatRupiah(sisaBayar)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
