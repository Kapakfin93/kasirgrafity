import React, { useEffect, useState } from "react";
import { supabase } from "../../services/supabaseClient";

// Format Rupiah
const formatRupiah = (num) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(num);

// Format Date
const formatDate = (isoString) => {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return "-";
  }
};

export function HistoryModal({ isOpen, onClose }) {
  const [receivables, setReceivables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState(new Set());

  // Fetch receivables data
  useEffect(() => {
    if (isOpen) {
      fetchReceivables();
    }
  }, [isOpen]);

  const fetchReceivables = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          payments:order_payments(*)
        `,
        )
        .gt("remaining_amount", 0)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReceivables(data || []);
    } catch (error) {
      console.error("Error fetching receivables:", error);
      setReceivables([]);
    } finally {
      setLoading(false);
    }
  };

  // Toggle expand/collapse
  const toggleExpand = (orderId) => {
    setExpandedOrders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  // Calculate summary
  const totalPiutang = receivables.reduce(
    (sum, order) => sum + (order.remaining_amount || 0),
    0,
  );

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
      onClick={onClose}
    >
      <div
        style={{
          background: "linear-gradient(145deg, #0f172a, #1e293b)",
          width: "90%",
          maxWidth: "900px",
          height: "85vh",
          borderRadius: "16px",
          border: "1px solid rgba(148, 163, 184, 0.2)",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div
          style={{
            padding: "24px",
            borderBottom: "1px solid rgba(148, 163, 184, 0.1)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h2
              style={{
                color: "#fff",
                margin: 0,
                fontSize: "22px",
                fontWeight: "bold",
              }}
            >
              💰 Ringkasan Piutang
            </h2>
            <div
              style={{ color: "#94a3b8", fontSize: "13px", marginTop: "4px" }}
            >
              Daftar order dengan pembayaran belum lunas
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(148, 163, 184, 0.2)",
              borderRadius: "8px",
              color: "#fff",
              fontSize: "20px",
              cursor: "pointer",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)";
              e.currentTarget.style.borderColor = "#ef4444";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
              e.currentTarget.style.borderColor = "rgba(148, 163, 184, 0.2)";
            }}
          >
            ✖
          </button>
        </div>

        {/* SUMMARY CARDS */}
        <div style={{ padding: "16px 24px", display: "flex", gap: "16px" }}>
          <div
            style={{
              flex: 1,
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: "12px",
              padding: "16px",
            }}
          >
            <div
              style={{ color: "#94a3b8", fontSize: "12px", fontWeight: "600" }}
            >
              TOTAL PIUTANG
            </div>
            <div
              style={{
                color: "#ef4444",
                fontSize: "24px",
                fontWeight: "bold",
                marginTop: "4px",
              }}
            >
              {formatRupiah(totalPiutang)}
            </div>
          </div>
          <div
            style={{
              flex: 1,
              background: "rgba(251, 191, 36, 0.1)",
              border: "1px solid rgba(251, 191, 36, 0.3)",
              borderRadius: "12px",
              padding: "16px",
            }}
          >
            <div
              style={{ color: "#94a3b8", fontSize: "12px", fontWeight: "600" }}
            >
              JUMLAH ORDER
            </div>
            <div
              style={{
                color: "#fbbf24",
                fontSize: "24px",
                fontWeight: "bold",
                marginTop: "4px",
              }}
            >
              {receivables.length} Order
            </div>
          </div>
        </div>

        {/* CONTENT - LIST */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 24px 24px" }}>
          {loading ? (
            <div
              style={{
                color: "#fff",
                textAlign: "center",
                padding: "60px 20px",
              }}
            >
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>⏳</div>
              <div style={{ color: "#94a3b8" }}>Memuat data piutang...</div>
            </div>
          ) : receivables.length === 0 ? (
            <div
              style={{
                color: "#64748b",
                textAlign: "center",
                padding: "60px 20px",
              }}
            >
              <div style={{ fontSize: "64px", marginBottom: "16px" }}>✅</div>
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "#94a3b8",
                }}
              >
                Tidak Ada Piutang
              </div>
              <div style={{ fontSize: "14px", marginTop: "8px" }}>
                Semua order sudah lunas
              </div>
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {receivables.map((order) => {
                const isExpanded = expandedOrders.has(order.id);
                const payments = order.payments || [];

                return (
                  <div
                    key={order.id}
                    style={{
                      background: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(148, 163, 184, 0.1)",
                      borderRadius: "12px",
                      overflow: "hidden",
                    }}
                  >
                    {/* Order Header (Clickable) */}
                    <div
                      onClick={() => toggleExpand(order.id)}
                      style={{
                        padding: "16px",
                        cursor: "pointer",
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          "rgba(255, 255, 255, 0.05)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "start",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              marginBottom: "8px",
                            }}
                          >
                            <span
                              style={{
                                color: "#fff",
                                fontWeight: "bold",
                                fontSize: "15px",
                              }}
                            >
                              {order.order_number || `#${order.id.slice(0, 8)}`}
                            </span>
                            <span
                              style={{ color: "#64748b", fontSize: "12px" }}
                            >
                              •
                            </span>
                            <span
                              style={{ color: "#94a3b8", fontSize: "14px" }}
                            >
                              {order.customer_name}
                            </span>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: "16px",
                              fontSize: "13px",
                            }}
                          >
                            <div>
                              <span style={{ color: "#64748b" }}>Total: </span>
                              <span
                                style={{ color: "#e2e8f0", fontWeight: "600" }}
                              >
                                {formatRupiah(order.total_amount)}
                              </span>
                            </div>
                            <div>
                              <span style={{ color: "#64748b" }}>
                                Terbayar:{" "}
                              </span>
                              <span
                                style={{ color: "#4ade80", fontWeight: "600" }}
                              >
                                {formatRupiah(order.paid_amount || 0)}
                              </span>
                            </div>
                            <div>
                              <span style={{ color: "#64748b" }}>Sisa: </span>
                              <span
                                style={{ color: "#ef4444", fontWeight: "700" }}
                              >
                                {formatRupiah(order.remaining_amount)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                          }}
                        >
                          {payments.length > 0 && (
                            <span
                              style={{
                                fontSize: "11px",
                                color: "#94a3b8",
                                background: "rgba(148, 163, 184, 0.1)",
                                padding: "4px 8px",
                                borderRadius: "4px",
                              }}
                            >
                              {payments.length} pembayaran
                            </span>
                          )}
                          <span
                            style={{
                              color: "#94a3b8",
                              fontSize: "16px",
                              transform: isExpanded
                                ? "rotate(180deg)"
                                : "rotate(0deg)",
                              transition: "transform 0.2s",
                              display: "inline-block",
                            }}
                          >
                            ▼
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Payment History (Collapsible) */}
                    {isExpanded && (
                      <div
                        style={{
                          borderTop: "1px solid rgba(148, 163, 184, 0.1)",
                          padding: "16px",
                          background: "rgba(0, 0, 0, 0.2)",
                        }}
                      >
                        {payments.length === 0 ? (
                          <div
                            style={{
                              color: "#64748b",
                              fontSize: "13px",
                              textAlign: "center",
                              padding: "12px",
                            }}
                          >
                            Belum ada pembayaran
                          </div>
                        ) : (
                          <div>
                            <div
                              style={{
                                color: "#94a3b8",
                                fontSize: "12px",
                                fontWeight: "600",
                                marginBottom: "12px",
                              }}
                            >
                              📜 HISTORI PEMBAYARAN
                            </div>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "8px",
                              }}
                            >
                              {payments.map((payment) => (
                                <div
                                  key={payment.id}
                                  style={{
                                    background: "rgba(255, 255, 255, 0.03)",
                                    border:
                                      "1px solid rgba(148, 163, 184, 0.1)",
                                    borderRadius: "8px",
                                    padding: "12px",
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                  }}
                                >
                                  <div>
                                    <div
                                      style={{
                                        color: "#e2e8f0",
                                        fontWeight: "600",
                                        fontSize: "14px",
                                      }}
                                    >
                                      {formatRupiah(payment.amount)}
                                    </div>
                                    <div
                                      style={{
                                        color: "#64748b",
                                        fontSize: "12px",
                                        marginTop: "4px",
                                      }}
                                    >
                                      {formatDate(payment.created_at)} •{" "}
                                      {payment.payment_method || "CASH"}
                                    </div>
                                  </div>
                                  <div style={{ textAlign: "right" }}>
                                    <div
                                      style={{
                                        color: "#94a3b8",
                                        fontSize: "11px",
                                      }}
                                    >
                                      Diterima oleh
                                    </div>
                                    <div
                                      style={{
                                        color: "#c084fc",
                                        fontSize: "12px",
                                        fontWeight: "600",
                                      }}
                                    >
                                      {payment.received_by || "-"}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid rgba(148, 163, 184, 0.1)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ color: "#64748b", fontSize: "12px" }}>
            Read-only mode • No actions available
          </div>
          <button
            onClick={fetchReceivables}
            style={{
              padding: "8px 16px",
              background: "rgba(139, 92, 246, 0.1)",
              color: "#a78bfa",
              border: "1px solid rgba(139, 92, 246, 0.3)",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "600",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(139, 92, 246, 0.2)";
              e.currentTarget.style.borderColor = "#8b5cf6";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(139, 92, 246, 0.1)";
              e.currentTarget.style.borderColor = "rgba(139, 92, 246, 0.3)";
            }}
          >
            🔄 Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
}
