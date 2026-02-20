import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { formatRupiah } from "../../core/formatters";
import useDraftStore from "../../stores/useDraftStore";
import DraftListModal from "./DraftListModal";
import { buildWAMessage } from "../../utils/waMessageBuilder";

/**
 * ReceiptSection - Wall Street Theme (Bloomberg Terminal Aesthetic)
 * Clean dark sidebar with emerald accents
 */
export function ReceiptSection({
  items,
  removeItem,
  totalAmount,
  isLocked: isLockedProp,
  onPrint,
  onReset,
  customerSnapshot,
  onOpenPaymentModal,
  paymentState,
  onLoadDraft, // New Prop: Hydrate POS from Draft
}) {
  const isLocked = isLockedProp || paymentState?.isLocked;
  const { mode, amountPaid } = paymentState || {};
  const paid = Number.parseFloat(amountPaid) || 0;

  // --- DRAFT & PRE-CHECKOUT LOGIC ---
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const { saveDraft, drafts, releaseDraft, fetchDrafts } = useDraftStore();

  // Active Draft Tracking (Local ID for release)
  const [activeDraftId, setActiveDraftId] = useState(null);

  // 🛡️ Initial Fetch for Badge Count
  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  // 🛡️ Auto-Release on Unload
  useEffect(() => {
    const handleUnload = () => {
      if (activeDraftId) releaseDraft(activeDraftId);
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [activeDraftId, releaseDraft]);

  // Handle Save Draft
  const handleSaveDraft = async () => {
    console.log("💾 SAVE DRAFT CLICKED");
    if (items.length === 0) return alert("Keranjang kosong!");

    // Normalisasi subtotal/meta
    const payload = {
      customer: customerSnapshot,
      total:
        typeof totalAmount === "object" ? totalAmount.finalAmount : totalAmount,
      items: items,
      meta: {
        note: "Saved from POS",
      },
    };

    console.log("📦 DRAFT PAYLOAD:", payload);

    const result = await saveDraft(payload, activeDraftId); // 🔑 UPDATE if existing, INSERT if new
    console.log("✅ SAVE RESULT:", result, "| activeDraftId:", activeDraftId);

    if (result.success) {
      if (
        window.confirm(
          "✅ Draft berhasil disimpan! Reset keranjang untuk pelanggan baru?",
        )
      ) {
        handleReset(); // Reset UI after save confirmation
      }
    } else {
      console.error("❌ SAVE FAILED:", result.error);
      alert(`❌ Gagal: ${result.error}`);
    }
  };

  // Handle Share WA (Auto-Save First)
  const handleShareWA = async () => {
    if (items.length === 0) return alert("Keranjang kosong!");

    // 1. AUTO-SAVE DRAFT (Guard against tab switching loss)
    const payload = {
      customer: customerSnapshot,
      total:
        typeof totalAmount === "object" ? totalAmount.finalAmount : totalAmount,
      items: items,
      meta: {
        note: "Auto-saved via WA Estimasi",
      },
    };

    try {
      const saveResult = await saveDraft(payload, activeDraftId); // 🔑 UPDATE if existing
      if (!saveResult.success) {
        alert(`Gagal menyimpan draft: ${saveResult.error}`);
        return; // Stop if save fails
      }
      console.log("✅ Auto-Save Success:", saveResult);
    } catch (err) {
      console.error("Auto-save error:", err);
      alert("Gagal menyimpan draft (System Error)");
      return;
    }

    // 2. Proceed to WhatsApp (Only if saved)
    let phone = customerSnapshot?.phone || "";
    // Normalize
    phone = phone.replace(/\D/g, "");
    if (phone.startsWith("0")) phone = "62" + phone.slice(1);

    if (!phone) {
      const input = prompt("Masukkan Nomor WA (62...):");
      if (!input) return;
      phone = input.replace(/\D/g, "");
      if (phone.startsWith("0")) phone = "62" + phone.slice(1);
    }

    // Build Message using Helper (Shared Logic)
    const msg = buildWAMessage({
      items: items,
      customer: customerSnapshot,
      total: totalAmount,
    });

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  // Handle Load Draft
  const handleLoadDraftAction = (draft) => {
    // 1. Hydrate UI (Call parent)
    if (onLoadDraft) onLoadDraft(draft);
    // 2. Set Active ID tracking
    setActiveDraftId(draft.id);
  };

  // Handle Reset (Interstitial to release draft)
  const handleReset = () => {
    if (activeDraftId) {
      releaseDraft(activeDraftId);
      setActiveDraftId(null);
    }
    onReset?.();
  };

  // FAIL-SAFE DISCOUNT LOGIC (User Request)
  // 1. Calculate Real Subtotal (Sum of all item totals)
  const realSubtotal = items.reduce(
    (sum, item) => sum + (item.totalPrice || 0),
    0,
  );

  // 2. Determine Final Total
  const isTotalObject = typeof totalAmount === "object";
  const finalAmount = isTotalObject
    ? totalAmount.finalAmount || 0
    : totalAmount || 0;

  // 3. Calculate Implied Discount (Subtotal - FinalTotal)
  const impliedDiscount = realSubtotal - finalAmount;

  // 4. Set Display Values
  const subtotal = realSubtotal;
  const appliedDiscount = Math.max(0, impliedDiscount);

  // Validation for checkout button
  const hasCustomerName =
    customerSnapshot?.name && customerSnapshot.name.trim() !== "";
  const canProceed = items.length > 0 && hasCustomerName;

  return (
    <div
      style={{
        background: "linear-gradient(180deg, #0f172a 0%, #020617 100%)",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        // OLD: width: "380px",
        // NEW: Responsive Flex
        flex: "0 0 28%", // Ideal width on 1080p
        minWidth: "350px", // Don't get too small
        maxWidth: "480px", // Don't get too wide on 4K
        border: "1px solid #334155",
      }}
    >
      <DraftListModal
        isOpen={isDraftModalOpen}
        onClose={() => setIsDraftModalOpen(false)}
        onLoadDraft={handleLoadDraftAction}
      />

      {/* NEON TOP STRIP - Emerald */}
      <div
        style={{
          height: "3px",
          width: "100%",
          background: "linear-gradient(90deg, #10b981, #059669, #047857)",
          boxShadow: "0 0 20px rgba(16, 185, 129, 0.5)",
        }}
      />

      <ReceiptHeader
        onOpenDrafts={() => setIsDraftModalOpen(true)}
        draftCount={drafts.length} // Note: This requires fetchDrafts to trigger initially or periodically
      />

      {/* ITEMS LIST - Scrollable Dark */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
        {items.length === 0 ? (
          <EmptyState />
        ) : (
          items.map((item) => (
            <ReceiptItem
              key={item.id}
              item={item}
              isLocked={isLocked}
              onRemove={() => removeItem(item.id)}
            />
          ))
        )}
      </div>

      {/* FOOTER - Totals & Action */}
      <div
        style={{
          padding: "16px",
          borderTop: "1px solid #334155",
          background: "rgba(15, 23, 42, 0.9)",
        }}
      >
        {isLocked ? (
          <PostPaymentView
            paid={paid}
            finalAmount={finalAmount}
            mode={mode}
            subtotal={subtotal}
            appliedDiscount={appliedDiscount}
            onPrint={onPrint}
            onReset={handleReset}
          />
        ) : (
          <CheckoutView
            subtotal={subtotal}
            appliedDiscount={appliedDiscount}
            finalAmount={finalAmount}
            hasCustomerName={hasCustomerName}
            itemsCount={items.length}
            canProceed={canProceed}
            onOpenPaymentModal={onOpenPaymentModal}
            onShareWA={handleShareWA}
            onSaveDraft={handleSaveDraft}
          />
        )}
      </div>
    </div>
  );
}

ReceiptSection.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      productName: PropTypes.string,
      name: PropTypes.string,
      pricingType: PropTypes.string,
      qty: PropTypes.number,
      totalPrice: PropTypes.number,
      finishings: PropTypes.array,
      dimensions: PropTypes.shape({
        length: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        sizeKey: PropTypes.string,
      }),
    }),
  ).isRequired,
  removeItem: PropTypes.func.isRequired,
  totalAmount: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.shape({
      subtotal: PropTypes.number,
      discount: PropTypes.number,
      discountAmount: PropTypes.number,
      finalAmount: PropTypes.number,
    }),
  ]).isRequired,
  isLocked: PropTypes.bool,
  onPrint: PropTypes.func,
  onReset: PropTypes.func,
  customerSnapshot: PropTypes.shape({
    name: PropTypes.string,
  }),
  onOpenPaymentModal: PropTypes.func,
  paymentState: PropTypes.shape({
    isLocked: PropTypes.bool,
    mode: PropTypes.string,
    amountPaid: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }),
  onLoadDraft: PropTypes.func,
};

// --- SUB COMPONENTS ---

const ReceiptHeader = ({ onOpenDrafts, draftCount }) => (
  <div
    style={{
      padding: "20px",
      textAlign: "center",
      borderBottom: "1px solid #334155",
      background: "rgba(15, 23, 42, 0.8)",
      position: "relative",
    }}
  >
    {/* Draft Button Absolute Position */}
    <button
      onClick={onOpenDrafts}
      className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
      title="Buka Estimasi Pending"
    >
      <span className="text-xl">📁</span>
      {draftCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold px-1 rounded-full animate-pulse shadow-sm">
          {draftCount}
        </span>
      )}
    </button>

    <h1
      style={{
        fontSize: "20px",
        fontWeight: "900",
        color: "#f1f5f9",
        letterSpacing: "0.2em",
        textTransform: "uppercase",
        marginBottom: "8px",
      }}
    >
      JOGLO <span style={{ color: "#10b981" }}>PRINTING</span>
    </h1>
    <div
      style={{
        fontSize: "10px",
        fontWeight: "500",
        color: "#64748b",
        lineHeight: "1.6",
        marginBottom: "10px",
      }}
    >
      <p style={{ margin: "2px 0" }}>Jl. Diponegoro, Rw. 4, Jogoloyo</p>
      <p
        style={{
          margin: "2px 0",
          fontFamily: "monospace",
          color: "#94a3b8",
        }}
      >
        0813-9028-6826
      </p>
    </div>
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "5px 12px",
        background: "rgba(16, 185, 129, 0.15)",
        color: "#10b981",
        borderRadius: "20px",
        fontSize: "9px",
        fontWeight: "800",
        textTransform: "uppercase",
        border: "1px solid rgba(16, 185, 129, 0.3)",
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: "#10b981",
          boxShadow: "0 0 8px #10b981",
        }}
      />
      <span>ONLINE 24H</span>
    </div>
  </div>
);

const EmptyState = () => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 20px",
      background: "rgba(30, 41, 59, 0.5)",
      borderRadius: "12px",
      border: "1px dashed #475569",
      color: "#64748b",
    }}
  >
    <span style={{ fontSize: "40px", opacity: 0.4 }}>🛒</span>
    <p style={{ marginTop: "12px", fontWeight: "600", fontSize: "13px" }}>
      No Active Orders
    </p>
    <p style={{ fontSize: "11px", color: "#475569", marginTop: "4px" }}>
      Select products to begin
    </p>
  </div>
);

const ReceiptItem = ({ item, isLocked, onRemove }) => {
  const { productName, dimensions, pricingType, qty, totalPrice, finishings } =
    item;
  const { length, width, sizeKey } = dimensions || {};

  return (
    <div
      style={{
        background: "rgba(30, 41, 59, 0.6)",
        borderRadius: "10px",
        padding: "12px",
        marginBottom: "8px",
        border: "1px solid #334155",
        opacity: isLocked ? 0.7 : 1,
        transition: "all 0.2s",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              color: "#f1f5f9",
              fontWeight: "700",
              fontSize: "13px",
              marginBottom: "4px",
            }}
          >
            {productName || item.name || "Unknown Item"}
          </div>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {(pricingType === "AREA" || pricingType === "CUSTOM") &&
              length &&
              width && (
                <span
                  style={{
                    background: "#1e3a5f",
                    color: "#60a5fa",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontSize: "10px",
                    fontWeight: "600",
                  }}
                >
                  {length}m × {width}m
                </span>
              )}
            {pricingType === "LINEAR" && length && (
              <span
                style={{
                  background: "#1e3a5f",
                  color: "#60a5fa",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontSize: "10px",
                  fontWeight: "600",
                }}
              >
                {length}m
              </span>
            )}
            {pricingType === "MATRIX" && sizeKey && (
              <span
                style={{
                  background: "#3b0764",
                  color: "#c084fc",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontSize: "10px",
                  fontWeight: "600",
                }}
              >
                {sizeKey}
              </span>
            )}
            <span
              style={{
                background: "#064e3b",
                color: "#34d399",
                padding: "2px 6px",
                borderRadius: "4px",
                fontSize: "10px",
                fontWeight: "700",
              }}
            >
              ×{qty}
            </span>
            {/* Material / Spec Chip — Fallback chain semua tipe produk */}
            {(() => {
              const spec =
                item.specs?.inputs?.material ||
                item.specs?.inputs?.paper ||
                item.specs?.inputs?.variant ||
                null;
              return spec ? (
                <span
                  style={{
                    background: "#451a03",
                    color: "#fbbf24",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontSize: "10px",
                    fontWeight: "600",
                    border: "1px solid #92400e",
                  }}
                >
                  {spec}
                </span>
              ) : null;
            })()}
          </div>
          {finishings && finishings.length > 0 && (
            <div
              style={{
                marginTop: "6px",
                display: "flex",
                gap: "4px",
                flexWrap: "wrap",
              }}
            >
              {finishings.map((f, idx) => (
                <span
                  key={f.id || `fin-${idx}`}
                  style={{
                    color: "#fbbf24",
                    fontSize: "10px",
                    fontWeight: "500",
                  }}
                >
                  +{f.name}
                </span>
              ))}
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "6px",
          }}
        >
          <div
            style={{
              color: "#10b981",
              fontWeight: "800",
              fontSize: "14px",
              fontFamily: "monospace",
            }}
          >
            {formatRupiah(totalPrice)}
          </div>
          {!isLocked && (
            <button
              onClick={onRemove}
              style={{
                padding: "4px 8px",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "#ef4444",
                cursor: "pointer",
                borderRadius: "4px",
                fontSize: "10px",
                fontWeight: "600",
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

ReceiptItem.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    productName: PropTypes.string,
    name: PropTypes.string,
    pricingType: PropTypes.string,
    qty: PropTypes.number,
    totalPrice: PropTypes.number,
    finishings: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        name: PropTypes.string,
      }),
    ),
    dimensions: PropTypes.shape({
      length: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      sizeKey: PropTypes.string,
    }),
  }).isRequired,
  isLocked: PropTypes.bool,
  onRemove: PropTypes.func.isRequired,
};

const PostPaymentView = ({
  paid,
  finalAmount,
  mode,
  subtotal,
  appliedDiscount,
  onPrint,
  onReset,
}) => (
  <div>
    {/* Status Badge */}
    <div
      style={{
        display: "inline-block",
        padding: "8px 16px",
        borderRadius: "8px",
        background:
          paid >= finalAmount
            ? "linear-gradient(135deg, #059669 0%, #10b981 100%)"
            : "linear-gradient(135deg, #be123c 0%, #f43f5e 100%)",
        color: "white",
        fontWeight: "900",
        fontSize: "11px",
        textTransform: "uppercase",
        marginBottom: "16px",
        boxShadow:
          paid >= finalAmount
            ? "0 0 20px rgba(16, 185, 129, 0.4)"
            : "0 0 20px rgba(244, 63, 94, 0.4)",
      }}
    >
      {paid >= finalAmount ? "✅ PAID IN FULL" : "⏳ PARTIAL PAYMENT"} ({mode})
    </div>

    {/* Summary */}
    <div style={{ marginBottom: "16px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          color: "#94a3b8",
          fontSize: "12px",
          marginBottom: "4px",
        }}
      >
        <span>SUBTOTAL</span>
        <span style={{ fontFamily: "monospace" }}>
          {formatRupiah(subtotal)}
        </span>
      </div>
      {appliedDiscount > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            color: "#f43f5e",
            fontSize: "12px",
            fontWeight: "600",
            marginBottom: "4px",
          }}
        >
          <span>DISCOUNT</span>
          <span style={{ fontFamily: "monospace" }}>
            -{formatRupiah(appliedDiscount)}
          </span>
        </div>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "8px",
          paddingTop: "8px",
          borderTop: "1px solid #334155",
        }}
      >
        <span
          style={{
            color: "#94a3b8",
            fontSize: "11px",
            fontWeight: "700",
          }}
        >
          TOTAL
        </span>
        <span
          style={{
            color: "#10b981",
            fontSize: "24px",
            fontWeight: "900",
            fontFamily: "monospace",
          }}
        >
          {formatRupiah(finalAmount)}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          color: "#64748b",
          fontSize: "12px",
          marginTop: "4px",
        }}
      >
        <span>PAID</span>
        <span style={{ fontFamily: "monospace" }}>{formatRupiah(paid)}</span>
      </div>
    </div>

    {/* Action Buttons */}
    <div style={{ display: "flex", gap: "8px" }}>
      <button
        onClick={onPrint}
        style={{
          flex: 1,
          padding: "12px",
          borderRadius: "8px",
          border: "1px solid #334155",
          background: "linear-gradient(180deg, #1e293b 0%, #0f172a 100%)",
          color: "#f1f5f9",
          fontWeight: "700",
          fontSize: "12px",
          cursor: "pointer",
        }}
      >
        🖨️ PRINT
      </button>
      <button
        onClick={() => onReset?.()}
        style={{
          flex: 1,
          padding: "12px",
          borderRadius: "8px",
          border: "1px solid #10b981",
          background: "transparent",
          color: "#10b981",
          fontWeight: "700",
          fontSize: "12px",
          cursor: "pointer",
        }}
      >
        🔄 NEW
      </button>
    </div>
  </div>
);

PostPaymentView.propTypes = {
  paid: PropTypes.number.isRequired,
  finalAmount: PropTypes.number.isRequired,
  mode: PropTypes.string,
  subtotal: PropTypes.number.isRequired,
  appliedDiscount: PropTypes.number.isRequired,
  onPrint: PropTypes.func,
  onReset: PropTypes.func,
};

const CheckoutView = ({
  subtotal,
  appliedDiscount,
  finalAmount,
  hasCustomerName,
  itemsCount,
  canProceed,
  onOpenPaymentModal,
  onShareWA,
  onSaveDraft,
}) => (
  <>
    {/* Summary */}
    <div style={{ marginBottom: "12px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          color: "#94a3b8",
          fontSize: "12px",
          marginBottom: "4px",
        }}
      >
        <span>SUBTOTAL</span>
        <span style={{ fontFamily: "monospace" }}>
          {formatRupiah(subtotal)}
        </span>
      </div>
      {appliedDiscount > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            color: "#f43f5e",
            fontSize: "12px",
            fontWeight: "600",
            marginBottom: "4px",
          }}
        >
          <span>DISCOUNT</span>
          <span style={{ fontFamily: "monospace" }}>
            -{formatRupiah(appliedDiscount)}
          </span>
        </div>
      )}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "8px",
          paddingTop: "8px",
          borderTop: "1px solid #334155",
        }}
      >
        <span
          style={{
            color: "#94a3b8",
            fontSize: "11px",
            fontWeight: "700",
            letterSpacing: "0.1em",
          }}
        >
          TOTAL
        </span>
        <span
          style={{
            color: "#10b981",
            fontSize: "28px",
            fontWeight: "900",
            fontFamily: "monospace",
            textShadow: "0 0 20px rgba(16, 185, 129, 0.3)",
          }}
        >
          {formatRupiah(finalAmount)}
        </span>
      </div>
    </div>

    {/* Validation Warning */}
    {!hasCustomerName && itemsCount > 0 && (
      <div
        style={{
          padding: "10px",
          marginBottom: "12px",
          background: "rgba(251, 191, 36, 0.1)",
          borderRadius: "8px",
          border: "1px solid rgba(251, 191, 36, 0.3)",
          fontSize: "11px",
          color: "#fbbf24",
          textAlign: "center",
        }}
      >
        ⚠️ Enter customer name to proceed
      </div>
    )}

    {/* PRE-CHECKOUT ACTIONS (New) */}
    <div className="flex gap-2 mb-3">
      <button
        onClick={onShareWA}
        className="flex-1 bg-green-900/40 border border-green-700 hover:border-green-500 text-green-400 py-2 rounded-lg text-xs font-bold transition-all"
        title="Kirim rincian via WhatsApp"
      >
        📱 WA ESTIMASI
      </button>
      <button
        onClick={onSaveDraft}
        className="flex-1 bg-yellow-900/40 border border-yellow-700 hover:border-yellow-500 text-yellow-400 py-2 rounded-lg text-xs font-bold transition-all"
        title="Simpan sementara (Parkir)"
      >
        💾 SIMPAN DRAFT
      </button>
    </div>

    {/* CHECKOUT BUTTON - Emerald Gradient */}
    <button
      onClick={onOpenPaymentModal}
      disabled={!canProceed}
      style={{
        width: "100%",
        padding: "16px",
        borderRadius: "10px",
        border: "none",
        background: canProceed
          ? "linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)"
          : "#475569",
        color: canProceed ? "#022c22" : "#94a3b8",
        fontSize: "15px",
        fontWeight: "900",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        cursor: canProceed ? "pointer" : "not-allowed",
        boxShadow: canProceed
          ? "0 0 30px rgba(16, 185, 129, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)"
          : "none",
        transition: "all 0.3s",
      }}
    >
      💳 CHECKOUT
    </button>
  </>
);

CheckoutView.propTypes = {
  subtotal: PropTypes.number.isRequired,
  appliedDiscount: PropTypes.number.isRequired,
  finalAmount: PropTypes.number.isRequired,
  hasCustomerName: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  itemsCount: PropTypes.number.isRequired,
  canProceed: PropTypes.bool.isRequired,
  onOpenPaymentModal: PropTypes.func,
  onShareWA: PropTypes.func,
  onSaveDraft: PropTypes.func,
};
