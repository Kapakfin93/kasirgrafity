import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabaseClient";
import { useAuthStore } from "../../stores/useAuthStore";

/**
 * MMTProductionReport.jsx
 * Laporan Konsumsi Bahan MMT (m² Harian) — Zona Owner
 * Dark mode, Glassmorphism, powered by Supabase RPC get_mmt_daily_production
 */

// --- HELPERS ---
const formatDate = (isoDate) => {
  if (!isoDate) return "-";
  const d = new Date(isoDate + "T00:00:00");
  return d.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const toInputDate = (d) => d.toISOString().split("T")[0];

const MATERIAL_COLORS = {
  "Flexi 280gr": "#10b981",
  "Flexi 340gr": "#3b82f6",
  "Flexi Korea": "#a855f7",
  "Flexi Backlite": "#f59e0b",
  default: "#64748b",
};

const getMaterialColor = (label = "") => {
  const hit = Object.keys(MATERIAL_COLORS).find((k) =>
    label.toLowerCase().includes(k.toLowerCase()),
  );
  return MATERIAL_COLORS[hit || "default"];
};

export function MMTProductionReport() {
  const { currentUser } = useAuthStore();
  const isOwner = currentUser?.role === "owner";

  // Default: 7 hari terakhir
  const today = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 7);

  const [startDate, setStartDate] = useState(toInputDate(sevenDaysAgo));
  const [endDate, setEndDate] = useState(toInputDate(today));
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- Drill-Down State ---
  const [selectedItem, setSelectedItem] = useState(null); // { date, material }
  const [detailData, setDetailData] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setData([]);
    const { data: rows, error: rpcError } = await supabase.rpc(
      "get_mmt_daily_production",
      {
        p_start_date: startDate,
        p_end_date: endDate,
      },
    );
    setLoading(false);
    if (rpcError) {
      console.error("RPC Error:", rpcError);
      setError(rpcError.message);
    } else {
      setData(rows || []);
    }
  }, [startDate, endDate]);

  const fetchDetails = useCallback(async (date, material) => {
    setDetailLoading(true);
    setDetailData([]);
    const { data: details, error: detailError } = await supabase.rpc(
      "get_mmt_production_details",
      {
        p_date: date,
        p_material: material,
      },
    );
    setDetailLoading(false);
    if (detailError) {
      console.error("Detail RPC Error:", detailError);
    } else {
      setDetailData(details || []);
    }
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") setShowModal(false);
    };
    if (showModal) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [showModal]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (active) await fetchData();
    })();
    return () => {
      active = false;
    };
  }, [fetchData]);

  // --- Computed summaries ---
  const totalSqm = data.reduce(
    (acc, r) => acc + parseFloat(r.total_sqm || 0),
    0,
  );
  const totalItems = data.reduce(
    (acc, r) => acc + parseInt(r.total_items || 0),
    0,
  );
  const totalQty = data.reduce(
    (acc, r) => acc + parseFloat(r.total_qty || 0),
    0,
  );

  // Group by material for subtotals
  const byMaterial = data.reduce((acc, row) => {
    const key = row.material_type;
    if (!acc[key]) acc[key] = { sqm: 0, items: 0, qty: 0 };
    acc[key].sqm += parseFloat(row.total_sqm || 0);
    acc[key].items += parseInt(row.total_items || 0);
    acc[key].qty += parseFloat(row.total_qty || 0);
    return acc;
  }, {});

  // --- Quick range shortcuts ---
  const setRange = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setStartDate(toInputDate(start));
    setEndDate(toInputDate(end));
  };

  const setThisMonth = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    setStartDate(toInputDate(start));
    setEndDate(toInputDate(now));
  };

  if (!isOwner) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#f43f5e" }}>
        <h2>🚫 Akses Ditolak</h2>
        <p>Halaman ini hanya dapat diakses oleh Owner.</p>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0a0f1e 0%, #0d1b2a 100%)",
        padding: "24px",
        color: "#f1f5f9",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}
    >
      {/* ===== HEADER ===== */}
      <div style={{ marginBottom: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              borderRadius: "12px",
              padding: "10px 14px",
              fontSize: "24px",
            }}
          >
            📐
          </div>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "22px",
                fontWeight: "800",
                letterSpacing: "0.05em",
                color: "#f1f5f9",
              }}
            >
              Laporan Konsumsi Bahan MMT
            </h1>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "12px",
                color: "#64748b",
                letterSpacing: "0.08em",
              }}
            >
              DATA PRODUKSI HARIAN — m² PER JENIS MATERIAL (STATUS DELIVERED)
            </p>
          </div>
        </div>
      </div>

      {/* ===== DATE RANGE CONTROLS ===== */}
      <div
        style={{
          background: "rgba(30, 41, 59, 0.8)",
          borderRadius: "16px",
          border: "1px solid rgba(51, 65, 85, 0.8)",
          padding: "20px",
          marginBottom: "24px",
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            alignItems: "flex-end",
          }}
        >
          {/* Start Date */}
          <div style={{ flex: "1", minWidth: "160px" }}>
            <label
              style={{
                display: "block",
                fontSize: "10px",
                fontWeight: "700",
                color: "#94a3b8",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: "6px",
              }}
            >
              📅 Dari Tanggal
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #334155",
                background: "#0f172a",
                color: "#f1f5f9",
                fontSize: "13px",
                fontWeight: "600",
              }}
            />
          </div>

          {/* End Date */}
          <div style={{ flex: "1", minWidth: "160px" }}>
            <label
              style={{
                display: "block",
                fontSize: "10px",
                fontWeight: "700",
                color: "#94a3b8",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: "6px",
              }}
            >
              📅 Sampai Tanggal
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid #334155",
                background: "#0f172a",
                color: "#f1f5f9",
                fontSize: "13px",
                fontWeight: "600",
              }}
            />
          </div>

          {/* Quick Shortcuts */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {[
              { label: "7 Hari", days: 7 },
              { label: "14 Hari", days: 14 },
              { label: "30 Hari", days: 30 },
            ].map(({ label, days }) => (
              <button
                key={days}
                onClick={() => setRange(days)}
                style={{
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid #334155",
                  background: "rgba(51, 65, 85, 0.5)",
                  color: "#94a3b8",
                  fontSize: "11px",
                  fontWeight: "700",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(16, 185, 129, 0.15)";
                  e.currentTarget.style.borderColor = "#10b981";
                  e.currentTarget.style.color = "#10b981";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(51, 65, 85, 0.5)";
                  e.currentTarget.style.borderColor = "#334155";
                  e.currentTarget.style.color = "#94a3b8";
                }}
              >
                {label}
              </button>
            ))}
            <button
              onClick={setThisMonth}
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid #334155",
                background: "rgba(51, 65, 85, 0.5)",
                color: "#94a3b8",
                fontSize: "11px",
                fontWeight: "700",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(59, 130, 246, 0.15)";
                e.currentTarget.style.borderColor = "#3b82f6";
                e.currentTarget.style.color = "#3b82f6";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(51, 65, 85, 0.5)";
                e.currentTarget.style.borderColor = "#334155";
                e.currentTarget.style.color = "#94a3b8";
              }}
            >
              Bulan Ini
            </button>
          </div>

          {/* Reload Button */}
          <button
            onClick={fetchData}
            disabled={loading}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "1px solid #10b981",
              background: loading
                ? "rgba(16, 185, 129, 0.1)"
                : "linear-gradient(135deg, #059669 0%, #10b981 100%)",
              color: loading ? "#10b981" : "#022c22",
              fontWeight: "800",
              fontSize: "11px",
              cursor: loading ? "not-allowed" : "pointer",
              letterSpacing: "0.05em",
              boxShadow: loading ? "none" : "0 0 20px rgba(16, 185, 129, 0.3)",
            }}
          >
            {loading ? "⏳ Memuat..." : "🔍 Tampilkan"}
          </button>
        </div>
      </div>

      {/* ===== SUMMARY CARDS ===== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        {/* TOTAL m² — Primary Hero Card */}
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.08) 100%)",
            borderRadius: "16px",
            border: "1px solid rgba(16, 185, 129, 0.35)",
            padding: "24px",
            boxShadow: "0 0 30px rgba(16, 185, 129, 0.1)",
            backdropFilter: "blur(12px)",
          }}
        >
          <p
            style={{
              margin: "0 0 8px",
              fontSize: "10px",
              fontWeight: "700",
              color: "#10b981",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
            }}
          >
            📐 Total Konsumsi
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "40px",
              fontWeight: "900",
              color: "#10b981",
              fontFamily: "monospace",
              textShadow: "0 0 30px rgba(16, 185, 129, 0.5)",
              lineHeight: 1,
            }}
          >
            {totalSqm.toFixed(2)}
          </p>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: "13px",
              color: "#64748b",
              fontWeight: "600",
            }}
          >
            m² Bahan MMT
          </p>
        </div>

        {/* TOTAL TRANSAKSI */}
        <div
          style={{
            background: "rgba(30, 41, 59, 0.8)",
            borderRadius: "16px",
            border: "1px solid rgba(51, 65, 85, 0.8)",
            padding: "24px",
            backdropFilter: "blur(12px)",
          }}
        >
          <p
            style={{
              margin: "0 0 8px",
              fontSize: "10px",
              fontWeight: "700",
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
            }}
          >
            📋 Jumlah Transaksi
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "40px",
              fontWeight: "900",
              color: "#f1f5f9",
              fontFamily: "monospace",
              lineHeight: 1,
            }}
          >
            {totalItems}
          </p>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: "13px",
              color: "#64748b",
              fontWeight: "600",
            }}
          >
            Item Dicetak
          </p>
        </div>

        {/* TOTAL QTY */}
        <div
          style={{
            background: "rgba(30, 41, 59, 0.8)",
            borderRadius: "16px",
            border: "1px solid rgba(51, 65, 85, 0.8)",
            padding: "24px",
            backdropFilter: "blur(12px)",
          }}
        >
          <p
            style={{
              margin: "0 0 8px",
              fontSize: "10px",
              fontWeight: "700",
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
            }}
          >
            📦 Total Qty
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "40px",
              fontWeight: "900",
              color: "#f1f5f9",
              fontFamily: "monospace",
              lineHeight: 1,
            }}
          >
            {totalQty}
          </p>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: "13px",
              color: "#64748b",
              fontWeight: "600",
            }}
          >
            Lembar Produksi
          </p>
        </div>
      </div>

      {/* ===== MATERIAL SUBTOTALS ===== */}
      {Object.keys(byMaterial).length > 0 && (
        <div
          style={{
            background: "rgba(15, 23, 42, 0.6)",
            borderRadius: "16px",
            border: "1px solid rgba(51, 65, 85, 0.6)",
            padding: "20px",
            marginBottom: "24px",
            backdropFilter: "blur(12px)",
          }}
        >
          <p
            style={{
              margin: "0 0 14px",
              fontSize: "11px",
              fontWeight: "700",
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
            }}
          >
            🎨 Subtotal Per Jenis Material
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            {Object.entries(byMaterial).map(([mat, agg]) => {
              const color = getMaterialColor(mat);
              return (
                <div
                  key={mat}
                  style={{
                    background: `rgba(${color === "#10b981" ? "16,185,129" : color === "#3b82f6" ? "59,130,246" : color === "#a855f7" ? "168,85,247" : color === "#f59e0b" ? "245,158,11" : "100,116,139"}, 0.12)`,
                    borderRadius: "10px",
                    border: `1px solid ${color}40`,
                    padding: "12px 16px",
                    minWidth: "160px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "10px",
                      fontWeight: "700",
                      color: color,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: "6px",
                    }}
                  >
                    {mat}
                  </div>
                  <div
                    style={{
                      fontSize: "22px",
                      fontWeight: "900",
                      color: "#f1f5f9",
                      fontFamily: "monospace",
                    }}
                  >
                    {agg.sqm.toFixed(2)} m²
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "#64748b",
                      marginTop: "2px",
                    }}
                  >
                    {agg.items} transaksi · {agg.qty} lembar
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== DATA TABLE ===== */}
      <div
        style={{
          background: "rgba(15, 23, 42, 0.8)",
          borderRadius: "16px",
          border: "1px solid rgba(51, 65, 85, 0.6)",
          overflow: "hidden",
          backdropFilter: "blur(12px)",
        }}
      >
        {/* Table Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #1e293b",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "12px",
              fontWeight: "700",
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
            }}
          >
            📊 Rincian Harian ({data.length} Baris)
          </p>
          {!loading && data.length > 0 && (
            <span
              style={{
                fontSize: "11px",
                color: "#10b981",
                fontWeight: "600",
              }}
            >
              ✅ Data Sinkron
            </span>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div
            style={{
              padding: "60px 20px",
              textAlign: "center",
              color: "#475569",
            }}
          >
            <div
              style={{
                fontSize: "32px",
                marginBottom: "12px",
                animation: "pulse 1.5s infinite",
              }}
            >
              ⏳
            </div>
            <p style={{ margin: 0, fontWeight: "600" }}>
              Memuat data dari Supabase...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "#f43f5e",
            }}
          >
            <div style={{ fontSize: "28px", marginBottom: "8px" }}>⚠️</div>
            <p style={{ margin: 0, fontWeight: "600" }}>{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && data.length === 0 && (
          <div
            style={{
              padding: "60px 20px",
              textAlign: "center",
              color: "#475569",
            }}
          >
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>📭</div>
            <p
              style={{
                margin: 0,
                fontWeight: "700",
                fontSize: "14px",
                color: "#64748b",
              }}
            >
              Tidak ada data dalam rentang tanggal ini.
            </p>
            <p
              style={{
                margin: "6px 0 0",
                fontSize: "12px",
                color: "#475569",
              }}
            >
              Coba perluas rentang waktu atau verifikasi data di POS.
            </p>
          </div>
        )}

        {/* Table Data */}
        {!loading && !error && data.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "13px",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "rgba(15, 23, 42, 0.9)",
                  }}
                >
                  {[
                    "Tanggal",
                    "Jenis Material",
                    "Items",
                    "Qty",
                    "Total m²",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "12px 16px",
                        textAlign: h === "Total m²" ? "right" : "left",
                        fontSize: "10px",
                        fontWeight: "700",
                        color: "#475569",
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        borderBottom: "1px solid #1e293b",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => {
                  const color = getMaterialColor(row.material_type);
                  return (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: "1px solid rgba(30, 41, 59, 0.6)",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(16, 185, 129, 0.12)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                      onClick={() => {
                        setSelectedItem({
                          date: row.completion_date,
                          material: row.material_type,
                        });
                        setShowModal(true);
                        fetchDetails(row.completion_date, row.material_type);
                      }}
                      title="Klik untuk lihat rincian nota"
                    >
                      <td
                        style={{
                          padding: "12px 16px",
                          color: "#94a3b8",
                          fontSize: "12px",
                          fontWeight: "600",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatDate(row.completion_date)}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: "20px",
                            background: `${color}1a`,
                            border: `1px solid ${color}40`,
                            color: color,
                            fontSize: "11px",
                            fontWeight: "700",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {row.material_type}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          color: "#f1f5f9",
                          fontFamily: "monospace",
                          fontWeight: "700",
                        }}
                      >
                        {row.total_items}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          color: "#f1f5f9",
                          fontFamily: "monospace",
                          fontWeight: "700",
                        }}
                      >
                        {row.total_qty}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          textAlign: "right",
                          fontFamily: "monospace",
                          fontWeight: "900",
                          fontSize: "15px",
                          color: "#10b981",
                        }}
                      >
                        {parseFloat(row.total_sqm).toFixed(2)}{" "}
                        <span
                          style={{
                            fontSize: "10px",
                            color: "#475569",
                            fontWeight: "600",
                          }}
                        >
                          m²
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Grand Total Footer */}
              <tfoot>
                <tr
                  style={{
                    borderTop: "2px solid #334155",
                    background: "rgba(16, 185, 129, 0.06)",
                  }}
                >
                  <td
                    colSpan={2}
                    style={{
                      padding: "14px 16px",
                      fontSize: "11px",
                      fontWeight: "800",
                      color: "#10b981",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                    }}
                  >
                    🏁 Grand Total
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "monospace",
                      fontWeight: "900",
                      color: "#f1f5f9",
                    }}
                  >
                    {totalItems}
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      fontFamily: "monospace",
                      fontWeight: "900",
                      color: "#f1f5f9",
                    }}
                  >
                    {totalQty}
                  </td>
                  <td
                    style={{
                      padding: "14px 16px",
                      textAlign: "right",
                      fontFamily: "monospace",
                      fontWeight: "900",
                      fontSize: "18px",
                      color: "#10b981",
                      textShadow: "0 0 20px rgba(16, 185, 129, 0.4)",
                    }}
                  >
                    {totalSqm.toFixed(2)}{" "}
                    <span
                      style={{
                        fontSize: "11px",
                        color: "#059669",
                        fontWeight: "700",
                      }}
                    >
                      m²
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ===== DRILL-DOWN MODAL ===== */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1000,
            background: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: "rgba(15, 23, 42, 0.95)",
              borderRadius: "20px",
              border: "1px solid rgba(51, 65, 85, 0.8)",
              width: "100%",
              maxWidth: "800px",
              maxHeight: "90vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid rgba(51, 65, 85, 0.5)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "rgba(30, 41, 59, 0.4)",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "18px", color: "#f1f5f9" }}>
                  Rincian Produksi
                </h3>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: "12px",
                    color: "#64748b",
                  }}
                >
                  {selectedItem &&
                    `${formatDate(selectedItem.date)} • ${selectedItem.material}`}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: "rgba(244, 63, 94, 0.1)",
                  border: "1px solid rgba(244, 63, 94, 0.3)",
                  color: "#f43f5e",
                  borderRadius: "8px",
                  padding: "6px 12px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "700",
                }}
              >
                TUTUP (ESC)
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
              {detailLoading ? (
                <div
                  style={{
                    padding: "40px",
                    textAlign: "center",
                    color: "#64748b",
                  }}
                >
                  <p>Memuat rincian nota...</p>
                </div>
              ) : detailData.length === 0 ? (
                <div
                  style={{
                    padding: "40px",
                    textAlign: "center",
                    color: "#64748b",
                  }}
                >
                  <p>Tidak ada data rincian.</p>
                </div>
              ) : (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "13px",
                  }}
                >
                  <thead>
                    <tr style={{ background: "rgba(15, 23, 42, 0.5)" }}>
                      <th
                        style={{
                          padding: "10px 14px",
                          textAlign: "left",
                          color: "#475569",
                          fontSize: "10px",
                          textTransform: "uppercase",
                        }}
                      >
                        Nota / Nama
                      </th>
                      <th
                        style={{
                          padding: "10px 14px",
                          textAlign: "center",
                          color: "#475569",
                          fontSize: "10px",
                          textTransform: "uppercase",
                        }}
                      >
                        Ukuran Asli
                      </th>
                      <th
                        style={{
                          padding: "10px 14px",
                          textAlign: "center",
                          color: "#475569",
                          fontSize: "10px",
                          textTransform: "uppercase",
                        }}
                      >
                        Qty
                      </th>
                      <th
                        style={{
                          padding: "10px 14px",
                          textAlign: "right",
                          color: "#475569",
                          fontSize: "10px",
                          textTransform: "uppercase",
                        }}
                      >
                        Subtotal m²
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailData.map((d, i) => (
                      <tr
                        key={i}
                        style={{
                          borderBottom: "1px solid rgba(30, 41, 59, 0.3)",
                        }}
                      >
                        <td style={{ padding: "12px 14px" }}>
                          <span
                            style={{
                              color: "#3b82f6",
                              fontWeight: "700",
                              marginRight: "8px",
                            }}
                          >
                            #{d.order_number}
                          </span>
                          <span style={{ color: "#94a3b8" }}>
                            {d.customer_name}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "12px 14px",
                            textAlign: "center",
                            color: "#f1f5f9",
                            fontFamily: "monospace",
                          }}
                        >
                          {d.formatted_size}
                        </td>
                        <td
                          style={{
                            padding: "12px 14px",
                            textAlign: "center",
                            color: "#f1f5f9",
                            fontWeight: "700",
                          }}
                        >
                          {d.qty}
                        </td>
                        <td
                          style={{
                            padding: "12px 14px",
                            textAlign: "right",
                            color: "#10b981",
                            fontWeight: "800",
                            fontFamily: "monospace",
                          }}
                        >
                          {parseFloat(d.sqm).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr
                      style={{
                        borderTop: "2px solid #334155",
                        background: "rgba(16, 185, 129, 0.05)",
                      }}
                    >
                      <td
                        colSpan={2}
                        style={{
                          padding: "14px 14px",
                          fontWeight: "800",
                          color: "#10b981",
                        }}
                      >
                        TOTAL
                      </td>
                      <td
                        style={{
                          padding: "14px 14px",
                          textAlign: "center",
                          color: "#f1f5f9",
                          fontWeight: "800",
                        }}
                      >
                        {detailData.reduce(
                          (acc, d) => acc + parseFloat(d.qty),
                          0,
                        )}
                      </td>
                      <td
                        style={{
                          padding: "14px 14px",
                          textAlign: "right",
                          color: "#10b981",
                          fontWeight: "900",
                          fontSize: "16px",
                        }}
                      >
                        {detailData
                          .reduce((acc, d) => acc + parseFloat(d.sqm), 0)
                          .toFixed(2)}{" "}
                        m²
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MMTProductionReport;
