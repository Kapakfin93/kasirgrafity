import React from "react";

export function ReceiptSection({
  items,
  removeItem,
  totalAmount,
  activeItemId,
  onItemClick,
  onConfirmPayment,
  transactionStage,
  // Props untuk Diskon & State
  discount,
  setDiscount,
  isLocked = false, // Default false
}) {
  const formatRupiah = (n) => {
    return "Rp " + n.toLocaleString("id-ID");
  };

  // --- LOGIKA PERHITUNGAN TOTAL & DISKON ---
  const subtotal =
    typeof totalAmount === "object" ? totalAmount.subtotal : totalAmount;
  const appliedDiscount =
    typeof totalAmount === "object" ? totalAmount.discount : 0;
  const finalAmount =
    typeof totalAmount === "object" ? totalAmount.finalAmount : totalAmount;

  // Menentukan teks tombol berdasarkan tahapan transaksi
  const getButtonText = () => {
    if (!transactionStage) return "SIMPAN & BAYAR";

    switch (transactionStage) {
      case "CART":
        return "Lanjut Pembayaran →";
      case "AWAITING_PAYMENT":
        return "PROSES PEMBAYARAN";
      case "POST_PAYMENT":
        return null; // Sembunyikan tombol saat struk muncul
      default:
        return "SIMPAN & BAYAR";
    }
  };

  const buttonText = getButtonText();

  return (
    <div className="receipt-section">
      <div className="receipt-header">
        <h2>NOTA PESANAN</h2>
        <div className="divider"></div>
      </div>

      <div className="receipt-items">
        {items.length === 0 && (
          <div
            className="empty-state"
            style={{ textAlign: "center", color: "#94a3b8", marginTop: "40px" }}
          >
            Belum ada item
          </div>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            className={`receipt-item-card ${activeItemId === item.id ? "active" : ""}`}
            onClick={() => onItemClick(item.id)}
            style={{
              cursor: "pointer",
              borderColor: activeItemId === item.id ? "#3b82f6" : "#e2e8f0",
              backgroundColor: activeItemId === item.id ? "#eff6ff" : "white",
            }}
          >
            <div className="item-info">
              <div
                className="item-header"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div className="item-name" style={{ fontWeight: 600 }}>
                  {item.productName}
                </div>
                <div
                  className="item-qty-badge"
                  style={{
                    background: "#e2e8f0",
                    padding: "2px 8px",
                    borderRadius: "12px",
                    fontSize: "11px",
                    fontWeight: "bold",
                    color: "#475569",
                  }}
                >
                  x{item.qty}
                </div>
              </div>

              <div
                className="item-desc"
                style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}
              >
                {item.description}
              </div>

              {/* Menampilkan Detail Finishing / Mode Cetak */}
              {item.finishings && item.finishings.length > 0 && (
                <ul
                  className="item-finishings"
                  style={{
                    marginTop: "4px",
                    paddingLeft: "14px",
                    fontSize: "11px",
                    color: "#059669",
                  }}
                >
                  {item.finishings.map((f, idx) => (
                    <li key={idx} style={{ listStyleType: "disc" }}>
                      {typeof f === "string" ? f : f.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="item-meta">
              <div className="item-price">{formatRupiah(item.totalPrice)}</div>
              <button
                className="btn-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  removeItem(item.id);
                }}
                disabled={isLocked}
                style={{
                  opacity: isLocked ? 0.3 : 1,
                  cursor: isLocked ? "not-allowed" : "pointer",
                }}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* === FITUR INPUT DISKON MANUAL (Kuning) === */}
      {items.length > 0 && !isLocked && setDiscount && (
        <div style={{ padding: "0 16px", marginTop: "10px" }}>
          <div
            style={{
              padding: "12px 14px",
              background: "linear-gradient(135deg, #fef3c7 0%, #fef9e6 100%)",
              borderRadius: "12px",
              border: "2px solid #fbbf24",
            }}
          >
            {(() => {
              const discountPercent =
                subtotal > 0 ? (discount / subtotal) * 100 : 0;
              const isHighDiscount = discountPercent > 50;

              return (
                <>
                  <label
                    style={{
                      display: "block",
                      fontSize: "11px",
                      fontWeight: "700",
                      color: "#92400e",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: "6px",
                    }}
                  >
                    🎟️ Potongan / Diskon (Rp)
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
                      fontSize: "16px",
                      fontWeight: "bold",
                      textAlign: "right",
                      color: "#dc2626",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: isHighDiscount
                        ? "2px solid #dc2626"
                        : "1px solid #d97706",
                      background: "white",
                      outline: "none",
                    }}
                    placeholder="0"
                    onFocus={(e) => e.target.select()}
                  />

                  {isHighDiscount && (
                    <div
                      style={{
                        marginTop: "6px",
                        padding: "6px 8px",
                        background: "#fee2e2",
                        borderRadius: "6px",
                        border: "1px solid #ef4444",
                        fontSize: "10px",
                        color: "#991b1b",
                        fontWeight: "bold",
                      }}
                    >
                      ⚠️ Warning: Diskon {discountPercent.toFixed(0)}%
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      <div className="receipt-footer">
        <div
          className="total-section"
          style={{ display: "flex", flexDirection: "column", gap: "8px" }}
        >
          {/* TAMPILAN SUBTOTAL (Jika ada diskon) */}
          {appliedDiscount > 0 && (
            <>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  color: "#64748b",
                  fontSize: "14px",
                }}
              >
                <span>Subtotal</span>
                <span>{formatRupiah(subtotal)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  color: "#ef4444",
                  fontSize: "14px",
                  fontWeight: "bold",
                }}
              >
                <span>Potongan</span>
                <span>- {formatRupiah(appliedDiscount)}</span>
              </div>
              <div
                style={{
                  height: "1px",
                  background: "#e2e8f0",
                  margin: "4px 0",
                }}
              ></div>
            </>
          )}

          {/* GRAND TOTAL */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{ fontSize: "16px", fontWeight: "bold", color: "#1e293b" }}
            >
              {isLocked ? "TOTAL BAYAR" : "TOTAL"}
            </span>
            <span
              className="total-amount"
              style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a" }}
            >
              {formatRupiah(finalAmount)}
            </span>
          </div>
        </div>

        {/* Tombol Pembayaran */}
        {buttonText && (
          <button
            className="btn-pay"
            onClick={onConfirmPayment}
            disabled={items.length === 0}
            style={{
              opacity: items.length === 0 ? 0.5 : 1,
              cursor: items.length === 0 ? "not-allowed" : "pointer",
              marginTop: "16px",
            }}
          >
            {buttonText}
          </button>
        )}
      </div>
    </div>
  );
}
