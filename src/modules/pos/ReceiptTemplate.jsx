import React from "react";

// Format Rupiah
const formatRupiah = (number = 0) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(number) || 0);

// Receipt Template (Thermal 58mm)
export const ReceiptTemplate = React.forwardRef(({ order }, ref) => {
  const styles = {
    page: {
      width: "58mm",
      padding: "6px",
      fontSize: "10px",
      fontFamily: '"Courier New", Courier, monospace',
      backgroundColor: "#fff",
      color: "#000",
    },
    center: { textAlign: "center", marginBottom: "6px" },
    title: { fontSize: "12px", fontWeight: "bold" },
    line: { borderBottom: "1px dashed #000", margin: "6px 0" },
    row: { display: "flex", justifyContent: "space-between" },
    bold: { fontWeight: "bold" },
    small: { fontSize: "9px", color: "#444" },
  };

  // CHECK DATA VALIDITY
  const isDataReady =
    order && order.orderNumber && order.customerName && order.receivedBy;

  if (!isDataReady) {
    // SILENT LOG
    // console.warn("🛑 RECEIPT DATA PENDING:", order);
  }

  return (
    <div
      ref={ref}
      className="receipt-container-wrapper"
      style={{ display: "block" }}
    >
      {!isDataReady ? (
        <div style={{ display: "none" }}>Loading Receipt Data...</div>
      ) : (
        <div style={styles.page}>
          {/* ===== HEADER ===== */}
          <div style={styles.center}>
            <div style={styles.title}>JOGLO PRINTING</div>
            <div>Jl. Grafika No.1 Semarang</div>
          </div>

          <div style={styles.line} />

          {/* ===== INFO ORDER (STRICT CAMELCASE) ===== */}
          <div style={{ marginBottom: "6px" }}>
            <div>
              Tgl: {new Date(order.createdAt).toLocaleDateString("id-ID")}
            </div>
            <div>
              Plg: {order.customerName || order.customer_name || "Guest"}
            </div>
            <div>CS : {order.receivedBy || order.received_by || "-"}</div>
            <div>HP : {order.customerPhone || "-"}</div>
            <div>No : {order.orderNumber}</div>
          </div>

          <div style={styles.line} />

          {/* ===== ITEMS ===== */}
          {Array.isArray(order.items) &&
            order.items.map((item, index) => {
              const meta = item.meta || item.metadata || {};

              return (
                <div key={index} style={{ marginBottom: "6px" }}>
                  <div>
                    {item.qty || item.quantity || 1}x {item.productName}
                  </div>

                  {/* Ukuran */}
                  {meta.custom_dimensions && (
                    <div style={styles.small}>
                      Ukuran: {meta.custom_dimensions.w} ×{" "}
                      {meta.custom_dimensions.h} cm
                    </div>
                  )}

                  {/* Finishing */}
                  {Array.isArray(meta.finishing_list) &&
                    meta.finishing_list.length > 0 && (
                      <div style={styles.small}>
                        Finishing: {meta.finishing_list.join(", ")}
                      </div>
                    )}

                  {/* Catatan */}
                  {item.notes && (
                    <div style={styles.small}>Catatan: {item.notes}</div>
                  )}

                  <div style={{ textAlign: "right" }}>
                    {formatRupiah(item.subtotal || 0)}
                  </div>
                </div>
              );
            })}

          {/* ===== LAYANAN PRODUKSI ===== */}
          {order.meta?.production_service?.fee > 0 && (
            <>
              <div style={styles.line} />
              <div style={{ marginBottom: "4px" }}>
                <div>{order.meta.production_service.label}</div>
                <div style={styles.row}>
                  <span>1 x</span>
                  <span>{formatRupiah(order.meta.production_service.fee)}</span>
                </div>
              </div>
            </>
          )}

          <div style={styles.line} />

          {/* ===== TOTAL ===== */}
          <div style={styles.row}>
            <span>Subtotal:</span>
            <span>{formatRupiah(order.totalAmount)}</span>
          </div>

          {order.discountAmount > 0 && (
            <div style={styles.row}>
              <span>Diskon:</span>
              <span>-{formatRupiah(order.discountAmount)}</span>
            </div>
          )}

          <div style={{ ...styles.row, ...styles.bold, marginTop: "6px" }}>
            <span>TOTAL:</span>
            <span>{formatRupiah(order.finalAmount || order.totalAmount)}</span>
          </div>

          {/* 🔥 PAYMENT TRANSPARENCY LOGIC (MATCHING NOTA PREVIEW) */}
          {(() => {
            // Robust Mode Extraction
            const mode =
              order.paymentMethod ||
              order.payment_method ||
              order.payment?.method ||
              "TUNAI";

            const paidAmount = Number(order.paidAmount || 0);
            const grandTotal = Number(
              order.finalAmount || order.totalAmount || 0,
            );
            const remaining = Number(order.remainingAmount || 0);

            return (
              <>
                <div style={styles.row}>
                  <span>
                    BAYAR (
                    {mode === "NON_TUNAI" || mode === "TRANSFER"
                      ? "TRANSFER"
                      : "TUNAI"}
                    ):
                  </span>
                  <span>{formatRupiah(paidAmount)}</span>
                </div>

                {remaining > 0 ? (
                  <div
                    style={{
                      ...styles.row,
                      ...styles.bold,
                      marginTop: "4px",
                      borderTop: "1px dashed #000",
                      paddingTop: "4px",
                    }}
                  >
                    <span>SISA TAGIHAN:</span>
                    <span>{formatRupiah(remaining)}</span>
                  </div>
                ) : (
                  <div style={styles.row}>
                    <span>KEMBALI:</span>
                    <span>
                      {formatRupiah(Math.max(0, paidAmount - grandTotal))}
                    </span>
                  </div>
                )}

                {/* BANK INFO BLOCK (PERMANENT) */}
                <div style={{ marginTop: "10px", textAlign: "center" }}>
                  <div style={styles.line} />
                  <div style={{ fontWeight: "bold", marginBottom: "2px" }}>
                    Transfer Pembayaran ke:
                  </div>
                  <div>BCA: 0097085203</div>
                  <div>BRI: 008301090560509</div>
                  <div style={{ fontStyle: "italic", fontSize: "9px" }}>
                    a.n Muhtarudin Nurul Habibi
                  </div>
                </div>
              </>
            );
          })()}

          <div style={styles.line} />

          <div style={styles.center}>*** TERIMA KASIH ***</div>
        </div>
      )}
    </div>
  );
});
