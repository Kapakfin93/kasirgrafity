/**

 * src/components/AuditLogModal.jsx (V4 - LOGIC PRIORITAS NAMA)

 * Fix: Menampilkan Nama Penerima Manual (Asepp) jika ada,

 * mengabaikan nama User Login (POS_WORKSPACE) untuk event pembayaran.

 */

import React, { useEffect, useState } from "react";

import { supabase } from "../services/supabaseClient";

import { formatDateTime } from "../utils/dateHelpers";

import { formatRupiah } from "../core/formatters";

// --- HELPER: PENERJEMAH ---

const humanizeTerm = (term) => {
  if (!term) return "-";

  const code = term.toUpperCase();

  const dictionary = {
    POS_WORKSPACE: "🖥️ Kasir Depan",

    ORDER_BOARD: "🏭 Tim Produksi",

    OWNER_DASHBOARD: "👑 Owner",

    SYSTEM: "🤖 Sistem Otomatis",

    KASIR: "👤 Kasir",

    OPERATOR: "👷 Operator",
  };

  if (dictionary[code]) return dictionary[code];

  if (code.includes("POS_WORKSPACE")) return "🖥️ Kasir Depan";

  if (code.includes("ORDER_BOARD")) return "🏭 Tim Produksi";

  return term;
};

export function AuditLogModal({ isOpen, onClose, orderId, orderNumber }) {
  const [logs, setLogs] = useState([]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && orderId) {
      fetchLogs();
    }
  }, [isOpen, orderId]);

  const fetchLogs = async () => {
    setLoading(true);

    // 🛡️ [FIX] HANDLE LOCAL ID (Prevent UUID Error 22P02)
    if (orderId && orderId.toString().startsWith("local_")) {
      try {
        // Safe Query: Hanya cari di metadata intra-JSON (Text), jangan scan ref_id (UUID)
        const { data, error } = await supabase
          .from("event_logs")
          .select("*")
          .eq("metadata->>ref_local_id", orderId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setLogs(data || []);
      } catch (err) {
        console.warn("Local Log Fetch Skipped/Error:", err.message);
        setLogs([]);
      } finally {
        setLoading(false);
      }
      return;
    }

    // STANDARD QUERY (Server ID / UUID)
    try {
      // 1. Cek apakah UUID Valid?
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          orderId,
        );

      let query = supabase.from("event_logs").select("*");

      if (isUuid) {
        // Jika UUID: Cari di ref_id ATAU metadata
        query = query.or(
          `ref_id.eq.${orderId},metadata->>ref_local_id.eq.${orderId},metadata->>order_id.eq.${orderId}`,
        );
      } else {
        // Jika BUKAN UUID (Integer/String): HANYA cari di metadata (Text Column)
        // Mencegah Error: invalid input syntax for type uuid
        query = query.or(
          `metadata->>ref_local_id.eq.${orderId},metadata->>order_id.eq.${orderId}`,
        );
      }

      const { data, error } = await query.order("created_at", {
        ascending: false,
      });

      if (error) throw error;

      setLogs(data || []);
    } catch (err) {
      console.error("Gagal ambil log CCTV:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIKA FORMATTING (JANTUNG PERBAIKAN) ---

  const formatAction = (log) => {
    const meta = log.metadata || {};

    switch (log.event_name) {
      case "pos_order_created":
        return (
          <span style={{ color: "#3b82f6", fontWeight: "bold" }}>
            ✨ Membuat Order Baru
          </span>
        );

      case "payment_recorded": {
        // 🔥 LOGIKA BARU: DETEKTIF NAMA 🔥
        // Cari nama di metadata dulu (Asepp).
        // Jika tidak ada di metadata, baru ambil nama user login (log.actor).
        // Kita cek 'received_by', 'receiver', atau 'receivedBy' untuk jaga-jaga variasi penulisan.

        const realReceiver =
          meta.received_by || meta.receivedBy || meta.receiver || log.actor;

        return (
          <div style={{ lineHeight: "1.5" }}>
            <span style={{ color: "#22c55e", fontWeight: "bold" }}>
              💰 Terima Pembayaran: {formatRupiah(meta.amount || 0)}
            </span>

            <div
              style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}
            >
              Metode: {meta.method || "TUNAI"}
              <span style={{ margin: "0 6px", color: "#cbd5e1" }}>|</span>
              {/* TAMPILKAN NAMA ASLI DISINI */}
              Penerima: <strong>{humanizeTerm(realReceiver)}</strong>
            </div>
          </div>
        );
      }

      case "order_status_changed":
        return (
          <span>
            🔄 Update Status:
            <span
              style={{
                color: "#6b7280",

                margin: "0 5px",

                fontSize: "11px",

                textDecoration: "line-through",
              }}
            >
              {meta.old_status}
            </span>
            ➔
            <span
              style={{
                color: "#22c55e",

                fontWeight: "bold",

                marginLeft: "5px",
              }}
            >
              {meta.new_status}
            </span>
          </span>
        );

      default:
        return (
          <span>📝 {log.event_name.replace(/_/g, " ").toUpperCase()}</span>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",

        top: 0,

        left: 0,

        right: 0,

        bottom: 0,

        backgroundColor: "rgba(0, 0, 0, 0.8)",

        display: "flex",

        justifyContent: "center",

        alignItems: "center",

        zIndex: 9999,

        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",

          borderRadius: "16px",

          width: "550px",

          maxWidth: "95%",

          maxHeight: "85vh",

          display: "flex",

          flexDirection: "column",

          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",

          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}

        <div
          style={{
            padding: "20px 24px",

            borderBottom: "1px solid #f1f5f9",

            display: "flex",

            justifyContent: "space-between",

            alignItems: "center",

            background: "#f8fafc",
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,

                fontSize: "18px",

                fontWeight: "800",

                color: "#1e293b",
              }}
            >
              🕵️‍♂️ Jejak Audit
            </h3>

            <div
              style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}
            >
              Order ID:{" "}
              <span style={{ fontFamily: "monospace", fontWeight: "bold" }}>
                {orderNumber}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "white",

              border: "1px solid #e2e8f0",

              borderRadius: "8px",

              width: "32px",

              height: "32px",

              display: "flex",

              alignItems: "center",

              justifyContent: "center",

              cursor: "pointer",

              color: "#64748b",
            }}
          >
            ✕
          </button>
        </div>

        {/* BODY */}

        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          {loading ? (
            <div
              style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}
            >
              ⏳ Mengambil data...
            </div>
          ) : logs.length === 0 ? (
            <div
              style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}
            >
              {orderId && orderId.toString().startsWith("local_") ? (
                <span>⏳ Log belum tersedia (Menunggu Sync)</span>
              ) : (
                <span>📭 Belum ada aktivitas.</span>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {logs.map((log, index) => (
                <div
                  key={log.id}
                  style={{
                    display: "flex",

                    gap: "16px",

                    position: "relative",

                    paddingBottom: "24px",
                  }}
                >
                  {index !== logs.length - 1 && (
                    <div
                      style={{
                        position: "absolute",

                        left: "6px",

                        top: "24px",

                        bottom: "0",

                        width: "2px",

                        background: "#e2e8f0",
                      }}
                    ></div>
                  )}

                  <div
                    style={{
                      minWidth: "14px",

                      height: "14px",

                      borderRadius: "50%",

                      background: index === 0 ? "#3b82f6" : "#cbd5e1",

                      marginTop: "4px",

                      zIndex: 1,

                      border: "2px solid white",

                      boxShadow:
                        index === 0
                          ? "0 0 0 2px rgba(59, 130, 246, 0.2)"
                          : "none",
                    }}
                  ></div>

                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: "11px",

                        color: "#94a3b8",

                        marginBottom: "4px",

                        fontFamily: "monospace",
                      }}
                    >
                      {formatDateTime(log.created_at)}
                    </div>

                    {/* FORMAT ACTION TERPANGGIL DISINI */}

                    <div
                      style={{
                        fontSize: "14px",

                        color: "#334155",

                        marginBottom: "8px",
                      }}
                    >
                      {formatAction(log)}
                    </div>

                    {/* Footer Kecil (Opsional - Jika payment sudah ada nama di atas, footer ini bisa untuk info teknis source) */}

                    {log.event_name !== "payment_recorded" && (
                      <div
                        style={{
                          display: "inline-flex",

                          alignItems: "center",

                          gap: "8px",

                          fontSize: "11px",

                          color: "#475569",

                          background: "#f1f5f9",

                          padding: "4px 8px",

                          borderRadius: "6px",
                        }}
                      >
                        <span>👤 {humanizeTerm(log.actor)}</span>

                        <span style={{ color: "#cbd5e1" }}>|</span>

                        <span>📍 {humanizeTerm(log.source)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
