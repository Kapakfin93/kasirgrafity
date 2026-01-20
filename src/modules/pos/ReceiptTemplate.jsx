import React from "react";

// 1. Format Rupiah Sederhana
const formatRupiah = (number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(number);
};

// 2. Komponen Struk (Wajib pakai React.forwardRef biar bisa di-print)
export const ReceiptTemplate = React.forwardRef(({ order }, ref) => {
  // Jika data order belum ada/kosong, jangan tampilkan apa-apa
  if (!order) return null;

  // Gaya CSS (Styling) khusus kertas Thermal 58mm
  // Kita tulis CSS di sini (inline) biar tidak butuh file CSS terpisah
  const styles = {
    page: {
      width: "58mm", // Lebar standar printer kasir kecil
      padding: "5px",
      fontSize: "10px",
      fontFamily: '"Courier New", Courier, monospace', // Font ala mesin ketik
      backgroundColor: "#fff",
      color: "#000",
    },
    center: { textAlign: "center", marginBottom: "5px" },
    title: { fontSize: "12px", fontWeight: "bold" },
    line: { borderBottom: "1px dashed #000", margin: "5px 0" },
    row: { display: "flex", justifyContent: "space-between" },
    bold: { fontWeight: "bold" },
  };

  return (
    <div ref={ref} style={styles.page}>
      {/* --- KOP STRUK --- */}
      <div style={styles.center}>
        <div style={styles.title}>JOGLO PRINT</div>
        <div>Jl. Grafika No.1 Semarang</div>
      </div>

      <div style={styles.line}></div>

      {/* --- INFORMASI --- */}
      <div>Tgl: {new Date().toLocaleDateString("id-ID")}</div>
      <div>Plg: {order.customerName || "Umum"}</div>
      <div>Kasir: {order.receivedBy || "Admin"}</div>

      <div style={styles.line}></div>

      {/* --- DAFTAR BARANG --- */}
      {order.items &&
        order.items.map((item, index) => (
          <div key={index} style={{ marginBottom: "4px" }}>
            <div>{item.productName}</div>
            <div style={styles.row}>
              <span>
                {item.qty} x {parseInt(item.price).toLocaleString()}
              </span>
              <span>{parseInt(item.totalPrice).toLocaleString()}</span>
            </div>
          </div>
        ))}

      <div style={styles.line}></div>

      {/* --- TOTALAN --- */}
      <div style={styles.row}>
        <span>Total:</span>
        <span>{formatRupiah(order.totalAmount)}</span>
      </div>

      {order.discountAmount > 0 && (
        <div style={styles.row}>
          <span>Diskon:</span>
          <span>-{formatRupiah(order.discountAmount)}</span>
        </div>
      )}

      <div style={{ ...styles.row, ...styles.bold, marginTop: "5px" }}>
        <span>TAGIHAN:</span>
        <span>{formatRupiah(order.finalAmount || order.totalAmount)}</span>
      </div>

      <div style={styles.line}></div>
      <div style={styles.center}>*** TERIMA KASIH ***</div>
    </div>
  );
});
