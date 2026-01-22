/**
 * WebInboxPanel Component
 * Admin panel for reviewing and processing orders from web landing
 * MANUAL PROCESSING ONLY - No automation
 */

import React, { useState, useEffect } from "react";
import { supabase } from "../../services/supabaseClient";
import { usePermissions } from "../../hooks/usePermissions";

export function WebInboxPanel() {
  const { isOwner } = usePermissions();

  // State
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentFilter, setCurrentFilter] = useState("NEW");
  const [statusCounts, setStatusCounts] = useState({});
  const [rejectModal, setRejectModal] = useState({ show: false, order: null });
  const [csInputModal, setCsInputModal] = useState({
    show: false,
    action: null,
    order: null,
  });
  const [csName, setCsName] = useState("");
  const [csNameError, setCsNameError] = useState("");

  // Load orders on mount and filter change
  useEffect(() => {
    loadWebInbox();
    loadStatusCounts();
  }, [currentFilter]);

  // === DATA LOADING ===

  const loadWebInbox = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("web_order_inbox")
        .select("*")
        .eq("status", currentFilter)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Failed to load web inbox:", error);
      alert("❌ Gagal load web inbox");
    } finally {
      setLoading(false);
    }
  };

  const loadStatusCounts = async () => {
    try {
      const { data, error } = await supabase
        .from("web_order_inbox")
        .select("status")
        .is("deleted_at", null);

      if (error) throw error;

      const counts = {
        NEW: 0,
        REVIEWED: 0,
        APPROVED: 0,
        REJECTED: 0,
      };

      (data || []).forEach((row) => {
        counts[row.status] = (counts[row.status] || 0) + 1;
      });

      setStatusCounts(counts);
    } catch (error) {
      console.error("Failed to load status counts:", error);
    }
  };

  // === ACTION HANDLERS ===

  const handleWhatsApp = (order) => {
    const phone = order.customer_phone.replace(/\D/g, "");
    const message = `Halo ${order.customer_name},

Terima kasih sudah order via website kami.

Detail order:
- Produk: ${order.product_code} (${order.variant_label || "-"})
- Harga: Rp ${order.quoted_amount?.toLocaleString() || "-"}

Kami sedang review order Anda. Mohon tunggu konfirmasi dari kami.

Terima kasih,
JOGLO PRINTING`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const handleCreatePOSOrder = (order) => {
    // Prevent double-click
    const button = event?.target;
    if (button?.disabled) return;
    if (button) button.disabled = true;

    try {
      // Prepare prefill data
      const prefillData = {
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        customerSnapshot: order.customer_snapshot,
        productCode: order.product_code,
        variantLabel: order.variant_label,
        specsSnapshot: order.specs_snapshot,
        suggestedAmount: order.quoted_amount,
        notes: `[WEB ORDER] ${order.notes_customer || ""}`,
        source: "WEB_LANDING",
        webInboxId: order.id,
        fileRef: order.file_ref,
        paymentProofRef: order.payment_proof_ref,
        timestamp: Date.now(), // For stale detection
      };

      // Save to sessionStorage (auto-cleared on tab close)
      sessionStorage.setItem("webOrderPrefill", JSON.stringify(prefillData));

      // Navigate to POS
      window.location.href = "/pos";
    } catch (error) {
      console.error("Failed to prefill POS:", error);
      alert("❌ Gagal membuka POS");
      if (button) button.disabled = false;
    }
  };

  const handleReject = (order) => {
    setCsInputModal({ show: true, action: "reject", order });
  };

  const handleCsNameChange = (e) => {
    const value = e.target.value;
    setCsName(value);
    const trimmed = value.trim();
    if (!trimmed) {
      setCsNameError("Nama CS wajib diisi");
    } else if (trimmed.length < 2) {
      setCsNameError("Nama CS minimal 2 karakter");
    } else if (/^\d+$/.test(trimmed)) {
      setCsNameError("Nama CS tidak boleh hanya angka");
    } else if (trimmed.length > 20) {
      setCsNameError("Nama CS maksimal 20 karakter");
    } else {
      setCsNameError("");
    }
  };

  const proceedWithCsName = () => {
    const trimmed = csName.trim();
    if (!trimmed || csNameError) {
      alert("Nama CS tidak valid");
      return;
    }

    if (csInputModal.action === "reject") {
      setCsInputModal({ show: false, action: null, order: null });
      setRejectModal({ show: true, order: csInputModal.order });
    }
    // For future approve action if needed
  };

  const confirmReject = async () => {
    const reason = document.getElementById("reject-reason").value;

    if (!reason || reason.trim() === "") {
      alert("Alasan reject harus diisi");
      return;
    }

    try {
      const { error } = await supabase
        .from("web_order_inbox")
        .update({
          status: "REJECTED",
          reviewed_at: new Date().toISOString(),
          reviewed_by: csName.trim(),
          rejected_at: new Date().toISOString(),
          notes_internal: reason,
        })
        .eq("id", rejectModal.order.id);

      if (error) throw error;

      alert("❌ Order direject");
      setRejectModal({ show: false, order: null });
      setCsName("");
      setCsNameError("");
      loadWebInbox();
      loadStatusCounts();
    } catch (error) {
      console.error("Failed to reject order:", error);
      alert("❌ Gagal reject order");
    }
  };

  const approveWebOrder = async (webInboxId, posOrderNumber) => {
    try {
      const { error } = await supabase
        .from("web_order_inbox")
        .update({
          status: "APPROVED",
          reviewed_at: new Date().toISOString(),
          reviewed_by: csName.trim(),
          approved_at: new Date().toISOString(),
          notes_internal: `Order POS created: ${posOrderNumber}`,
        })
        .eq("id", webInboxId);

      if (error) throw error;

      alert("✅ Order approved dan web inbox diupdate");
      loadWebInbox();
      loadStatusCounts();
    } catch (error) {
      console.error("Failed to approve order:", error);
      alert("❌ Gagal approve order");
    }
  };

  // === HELPERS ===

  const getRelativeTime = (timestamp) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now - past;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return "Baru saja";
    if (diffHours < 24) return `${diffHours} jam yang lalu`;
    if (diffDays === 1) return "1 hari yang lalu";
    return `${diffDays} hari yang lalu`;
  };

  const getStatusBadge = (status) => {
    const badges = {
      NEW: { icon: "🆕", label: "NEW", color: "#f59e0b" },
      REVIEWED: { icon: "👁️", label: "REVIEWED", color: "#eab308" },
      APPROVED: { icon: "✅", label: "APPROVED", color: "#22c55e" },
      REJECTED: { icon: "❌", label: "REJECTED", color: "#64748b" },
    };
    return badges[status] || badges.NEW;
  };

  // Permission check
  if (!isOwner) {
    return (
      <div className="access-denied">
        <h2>❌ Akses Ditolak</h2>
        <p>Hanya Owner yang bisa mengakses Web Inbox.</p>
      </div>
    );
  }

  return (
    <div className="web-inbox-panel">
      {/* Header */}
      <div className="inbox-header">
        <div>
          <h1>📱 WEB INBOX</h1>
          <p className="subtitle">Order dari web landing - Review manual</p>
        </div>
        <button
          onClick={() => {
            loadWebInbox();
            loadStatusCounts();
          }}
          className="refresh-btn"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        {["NEW", "REVIEWED", "APPROVED", "REJECTED"].map((status) => (
          <button
            key={status}
            className={`filter-tab ${currentFilter === status ? "active" : ""}`}
            onClick={() => setCurrentFilter(status)}
          >
            {getStatusBadge(status).icon} {status}
            {statusCounts[status] > 0 && (
              <span className="count-badge">{statusCounts[status]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && <div className="loading">⏳ Memuat data...</div>}

      {/* Empty State */}
      {!loading && orders.length === 0 && (
        <div className="empty-state">
          <p>📭 Tidak ada order dengan status {currentFilter}</p>
        </div>
      )}

      {/* Order Cards */}
      <div className="order-cards">
        {orders.map((order) => (
          <OrderCard
            key={order.id}
            order={order}
            onWhatsApp={handleWhatsApp}
            onCreatePOS={handleCreatePOSOrder}
            onReject={handleReject}
            getRelativeTime={getRelativeTime}
            getStatusBadge={getStatusBadge}
          />
        ))}
      </div>

      {/* CS Input Modal */}
      {csInputModal.show && (
        <div
          className="modal-overlay"
          onClick={() =>
            setCsInputModal({ show: false, action: null, order: null })
          }
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>👤 Masukkan Nama CS</h3>
            <p
              style={{
                color: "#94a3b8",
                fontSize: "14px",
                marginBottom: "16px",
              }}
            >
              Siapa yang menangani order ini?
            </p>

            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "600",
              }}
            >
              Nama CS:
            </label>
            <input
              type="text"
              value={csName}
              onChange={handleCsNameChange}
              placeholder="Masukkan nama CS..."
              autoFocus
              style={{
                width: "100%",
                padding: "10px 12px",
                background: "rgba(30, 41, 59, 0.8)",
                border: csNameError
                  ? "1px solid rgba(239, 68, 68, 0.5)"
                  : "1px solid rgba(71, 85, 105, 0.5)",
                borderRadius: "8px",
                color: "white",
                fontSize: "14px",
                outline: "none",
              }}
            />
            {csNameError && (
              <div
                style={{
                  color: "#ef4444",
                  fontSize: "12px",
                  marginTop: "4px",
                }}
              >
                ⚠️ {csNameError}
              </div>
            )}

            <div
              style={{
                marginTop: "16px",
                display: "flex",
                gap: "8px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => {
                  setCsInputModal({ show: false, action: null, order: null });
                  setCsName("");
                  setCsNameError("");
                }}
                style={{ padding: "8px 16px" }}
              >
                Batal
              </button>
              <button
                onClick={proceedWithCsName}
                disabled={!!csNameError || !csName.trim()}
                style={{
                  padding: "8px 16px",
                  background:
                    csNameError || !csName.trim() ? "#64748b" : "#06b6d4",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor:
                    csNameError || !csName.trim() ? "not-allowed" : "pointer",
                  opacity: csNameError || !csName.trim() ? 0.5 : 1,
                }}
              >
                Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal.show && (
        <div
          className="modal-overlay"
          onClick={() => setRejectModal({ show: false, order: null })}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>❌ Reject Order</h3>
            <p>Customer: {rejectModal.order.customer_name}</p>
            <p>Product: {rejectModal.order.product_code}</p>

            <label>Alasan Reject:</label>
            <textarea
              id="reject-reason"
              rows="4"
              placeholder="Contoh: File tidak sesuai, minta customer upload ulang"
              style={{ width: "100%", padding: "8px", marginTop: "8px" }}
            />

            <div
              style={{
                marginTop: "16px",
                display: "flex",
                gap: "8px",
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setRejectModal({ show: false, order: null })}
                style={{ padding: "8px 16px" }}
              >
                Batal
              </button>
              <button
                onClick={confirmReject}
                style={{
                  padding: "8px 16px",
                  background: "#ef4444",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// === ORDER CARD COMPONENT ===

function OrderCard({
  order,
  onWhatsApp,
  onCreatePOS,
  onReject,
  getRelativeTime,
  getStatusBadge,
}) {
  const badge = getStatusBadge(order.status);

  return (
    <div className="order-card">
      {/* Header */}
      <div className="card-header">
        <span
          className="status-badge"
          style={{
            background: `${badge.color}20`,
            color: badge.color,
            border: `1px solid ${badge.color}`,
          }}
        >
          {badge.icon} {badge.label}
        </span>
        <span className="timestamp">{getRelativeTime(order.created_at)}</span>
      </div>

      {/* Customer Info */}
      <div className="card-body">
        <div className="info-row">
          <span className="icon">👤</span>
          <span className="value">{order.customer_name}</span>
        </div>

        <div className="info-row">
          <span className="icon">📦</span>
          <span className="value">
            {order.product_code}{" "}
            {order.variant_label && `• ${order.variant_label}`}
          </span>
        </div>

        {order.quoted_amount && (
          <div className="info-row">
            <span className="icon">💰</span>
            <span className="value">
              Rp {order.quoted_amount.toLocaleString()} (dari web)
            </span>
          </div>
        )}

        {order.notes_customer && (
          <div className="info-row">
            <span className="icon">📝</span>
            <span className="value">"{order.notes_customer}"</span>
          </div>
        )}

        <div className="info-row">
          <span className="icon">📞</span>
          <span className="value">{order.customer_phone}</span>
        </div>

        {order.file_ref && (
          <div className="info-row">
            <span className="icon">📎</span>
            <a
              href={order.file_ref}
              target="_blank"
              rel="noopener noreferrer"
              className="link"
            >
              File: {order.file_ref.split("/").pop()}
            </a>
          </div>
        )}

        {order.payment_proof_ref && (
          <div className="info-row">
            <span className="icon">💳</span>
            <a
              href={order.payment_proof_ref}
              target="_blank"
              rel="noopener noreferrer"
              className="link"
            >
              Bukti: {order.payment_proof_ref.split("/").pop()}
            </a>
          </div>
        )}

        {/* Approved/Rejected Info */}
        {order.status === "APPROVED" && order.notes_internal && (
          <div className="info-row success">
            <span className="icon">✓</span>
            <span className="value">{order.notes_internal}</span>
          </div>
        )}

        {order.status === "REJECTED" && order.notes_internal && (
          <div className="info-row error">
            <span className="icon">✗</span>
            <span className="value">Alasan: {order.notes_internal}</span>
          </div>
        )}
      </div>

      {/* Action Buttons (only for NEW status) */}
      {order.status === "NEW" && (
        <div className="card-actions">
          <button
            className="btn btn-whatsapp"
            onClick={() => onWhatsApp(order)}
          >
            📱 WhatsApp
          </button>
          <button className="btn btn-create" onClick={() => onCreatePOS(order)}>
            ✅ Buat Order POS
          </button>
          <button className="btn btn-reject" onClick={() => onReject(order)}>
            ❌ Reject
          </button>
        </div>
      )}
    </div>
  );
}

export default WebInboxPanel;
