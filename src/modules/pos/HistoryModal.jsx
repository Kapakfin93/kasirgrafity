import React, { useEffect } from "react";
import { useOrderStore } from "../../stores/useOrderStore";

// Format Rupiah
const formatRupiah = (num) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(num);

// Format Jam
const formatTime = (isoString) => {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return "-";
  }
};

export function HistoryModal({ isOpen, onClose }) {
  const { orders, isLoading, loadTodayOrders, stats } = useOrderStore();

  useEffect(() => {
    if (isOpen) {
      loadTodayOrders();
    }
  }, [isOpen, loadTodayOrders]); // Added loadTodayOrders dependency

  // --- PENGAMAN DATA (SAFEGUARD) ---
  const safeStats = stats || { totalRevenue: 0, totalCount: 0 };
  const safeOrders = orders || [];
  // -------------------------------

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(5px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          background: "#0f172a",
          width: "90%",
          maxWidth: "800px",
          height: "80vh",
          borderRadius: "16px",
          border: "1px solid #334155",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            padding: "20px",
            borderBottom: "1px solid #334155",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2 style={{ color: "#fff", margin: 0, fontSize: "20px" }}>
              📜 Riwayat Transaksi Hari Ini
            </h2>
            <div
              style={{ color: "#94a3b8", fontSize: "13px", marginTop: "4px" }}
            >
              Total: {safeStats.totalCount} Nota • Omzet:{" "}
              <span style={{ color: "#4ade80", fontWeight: "bold" }}>
                {formatRupiah(safeStats.totalRevenue)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#fff",
              fontSize: "24px",
              cursor: "pointer",
            }}
          >
            ✖
          </button>
        </div>

        {/* CONTENT - LIST */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {isLoading ? (
            <div
              style={{ color: "#fff", textAlign: "center", padding: "40px" }}
            >
              ⏳ Sedang memuat data...
            </div>
          ) : safeOrders.length === 0 ? (
            <div
              style={{ color: "#64748b", textAlign: "center", padding: "40px" }}
            >
              Belum ada transaksi hari ini.
            </div>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                color: "#e2e8f0",
                fontSize: "14px",
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid #334155",
                    color: "#94a3b8",
                    textAlign: "left",
                  }}
                >
                  <th style={{ padding: "10px" }}>Jam</th>
                  <th style={{ padding: "10px" }}>Pelanggan</th>
                  <th style={{ padding: "10px" }}>Status</th>
                  <th style={{ padding: "10px" }}>Metode</th>
                  <th style={{ padding: "10px", textAlign: "right" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {safeOrders.map((order) => (
                  <tr
                    key={order.id}
                    style={{ borderBottom: "1px solid #1e293b" }}
                  >
                    <td style={{ padding: "12px 10px", color: "#94a3b8" }}>
                      {formatTime(order.created_at)}
                    </td>
                    <td style={{ padding: "12px 10px" }}>
                      <div style={{ fontWeight: "bold" }}>
                        {order.customer_name}
                      </div>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>
                        CS: {order.received_by}
                      </div>
                    </td>
                    <td style={{ padding: "12px 10px" }}>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: "bold",
                          background:
                            order.payment_status === "PAID"
                              ? "rgba(74, 222, 128, 0.1)"
                              : "rgba(248, 113, 113, 0.1)",
                          color:
                            order.payment_status === "PAID"
                              ? "#4ade80"
                              : "#f87171",
                        }}
                      >
                        {order.payment_status}
                      </span>
                    </td>
                    <td style={{ padding: "12px 10px" }}>
                      {order.payment_method}
                    </td>
                    <td
                      style={{
                        padding: "12px 10px",
                        textAlign: "right",
                        fontWeight: "bold",
                      }}
                    >
                      {formatRupiah(order.total_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* FOOTER */}
        <div
          style={{
            padding: "15px",
            borderTop: "1px solid #334155",
            textAlign: "right",
          }}
        >
          <button
            onClick={() => loadTodayOrders()}
            style={{
              marginRight: "10px",
              padding: "8px 16px",
              background: "#334155",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
