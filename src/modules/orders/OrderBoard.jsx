/**
 * OrderBoard Component (OPTIMIZED v2)
 * Production tracking board with Server-Side Filtering
 * Fixes: Pagination Logic, Dashboard Sync, & Dead Code Removal
 */

import React, { useEffect, useState } from "react";
import { useOrderStore } from "../../stores/useOrderStore";
import { usePermissions } from "../../hooks/usePermissions";
import { OrderCard } from "./OrderCard";

export function OrderBoard() {
  const {
    orders,
    loading,
    error,
    // Pagination state
    currentPage,
    totalPages,
    totalOrders,
    searchQuery: storeSearchQuery,
    // Actions
    loadOrders,
    searchOrders,
    loadSummary, // PENTING: Untuk update Dashboard Owner
    summaryData,
  } = useOrderStore();

  const permissions = usePermissions();
  const canViewOrders = permissions.canViewOrders();

  // STATE LOKAL UNTUK FILTER (Server-Side Trigger)
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [productionFilter, setProductionFilter] = useState("ALL");
  const [localSearchQuery, setLocalSearchQuery] = useState("");

  // === 1. DATA LOADING & FILTERING ENGINE ===
  // Setiap kali Page, Filter, atau Search berubah, kita minta data BARU ke Server
  useEffect(() => {
    // Jika sedang searching, jangan load paginated biasa (biarkan fungsi searchOrders yg kerja)
    if (storeSearchQuery) return;

    loadOrders({
      page: currentPage,
      limit: 20,
      paymentStatus: paymentFilter,
      productionStatus: productionFilter,
    });

    // REFRESH DASHBOARD JUGA (Agar Net Profit Owner Update!)
    loadSummary();
  }, [
    currentPage,
    paymentFilter,
    productionFilter,
    loadOrders,
    loadSummary,
    storeSearchQuery,
  ]);

  // === 2. SEARCH HANDLER (Debounce) ===
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearchQuery !== storeSearchQuery) {
        searchOrders(localSearchQuery);
      }
    }, 500); // 500ms delay agar tidak spam server

    return () => clearTimeout(timer);
  }, [localSearchQuery, storeSearchQuery, searchOrders]);

  // === 3. FILTER HANDLERS ===
  const handlePaymentFilter = (status) => {
    setPaymentFilter(status);
    // Reset ke halaman 1 setiap ganti filter
    if (currentPage !== 1)
      loadOrders({
        page: 1,
        paymentStatus: status,
        productionStatus: productionFilter,
      });
  };

  const handleProductionFilter = (status) => {
    setProductionFilter(status);
    // Reset ke halaman 1 setiap ganti filter
    if (currentPage !== 1)
      loadOrders({
        page: 1,
        paymentStatus: paymentFilter,
        productionStatus: status,
      });
  };

  // === 4. PAGINATION HANDLERS ===
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      loadOrders({
        page: currentPage + 1,
        paymentStatus: paymentFilter,
        productionStatus: productionFilter,
      });
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      loadOrders({
        page: currentPage - 1,
        paymentStatus: paymentFilter,
        productionStatus: productionFilter,
      });
    }
  };

  // Check permissions
  if (!canViewOrders) {
    return (
      <div className="access-denied">
        <h2>❌ Akses Ditolak</h2>
        <p>Anda tidak memiliki izin untuk melihat halaman ini.</p>
      </div>
    );
  }

  // Get counts for UI Badges (Optional, from summary)
  const counts = {
    PENDING: summaryData?.countByProductionStatus?.PENDING || 0,
    IN_PROGRESS: summaryData?.countByProductionStatus?.IN_PROGRESS || 0,
    READY: summaryData?.countByProductionStatus?.READY || 0,
  };

  return (
    <div className="order-board">
      {/* Header */}
      <div className="board-header">
        <div className="board-title">
          <h1>📋 Order Board - Produksi</h1>
          <p className="subtitle">
            Tracking status pesanan real-time
            {totalOrders > 0 && (
              <span style={{ marginLeft: "8px", color: "#64748b" }}>
                ({totalOrders.toLocaleString()} total)
              </span>
            )}
          </p>
        </div>

        {/* Search */}
        <div className="board-search">
          <input
            type="text"
            placeholder="🔍 Cari pesanan... (nama, ID)"
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Filters Area */}
      <div className="board-filters">
        {/* Payment Filter */}
        <div className="filter-group">
          <label>Status Pembayaran:</label>
          <div className="filter-buttons">
            {["ALL", "UNPAID", "DP", "PAID"].map((status) => (
              <button
                key={status}
                className={`filter-btn ${status.toLowerCase()} ${paymentFilter === status ? "active" : ""}`}
                onClick={() => handlePaymentFilter(status)}
              >
                {status === "ALL"
                  ? "Semua"
                  : status === "UNPAID"
                    ? "Belum Bayar"
                    : status}
              </button>
            ))}
          </div>
        </div>

        {/* Production Filter */}
        <div className="filter-group">
          <label>Status Produksi:</label>
          <div className="filter-buttons">
            <button
              className={`filter-btn ${productionFilter === "ALL" ? "active" : ""}`}
              onClick={() => handleProductionFilter("ALL")}
            >
              Semua
            </button>
            <button
              className={`filter-btn pending ${productionFilter === "PENDING" ? "active" : ""}`}
              onClick={() => handleProductionFilter("PENDING")}
            >
              Pending {productionFilter === "ALL" && `(${counts.PENDING})`}
            </button>
            <button
              className={`filter-btn progress ${productionFilter === "IN_PROGRESS" ? "active" : ""}`}
              onClick={() => handleProductionFilter("IN_PROGRESS")}
            >
              Dikerjakan{" "}
              {productionFilter === "ALL" && `(${counts.IN_PROGRESS})`}
            </button>
            <button
              className={`filter-btn ready ${productionFilter === "READY" ? "active" : ""}`}
              onClick={() => handleProductionFilter("READY")}
            >
              Siap {productionFilter === "ALL" && `(${counts.READY})`}
            </button>
          </div>
        </div>
      </div>

      {/* Loading / Error State */}
      {loading && <div className="board-loading">⏳ Memuat data...</div>}
      {error && <div className="board-error">❌ Error: {error}</div>}

      {/* Order Cards Grid */}
      <div className="board-grid">
        {!loading && orders.length === 0 && (
          <div className="board-empty">
            <p>📭 Tidak ada pesanan untuk filter ini.</p>
            {localSearchQuery && <p>Coba ubah kata kunci pencarian.</p>}
          </div>
        )}

        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>

      {/* === PAGINATION CONTROLS === */}
      {/* Tampilkan pagination jika bukan mode search DAN total halaman > 1 */}
      {!storeSearchQuery && totalPages > 1 && (
        <div
          className="pagination-controls"
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "16px",
            padding: "24px",
            marginTop: "16px",
            background: "#f8fafc",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
          }}
        >
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1 || loading}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              background: currentPage === 1 ? "#e2e8f0" : "#3b82f6",
              color: currentPage === 1 ? "#94a3b8" : "white",
              cursor: currentPage === 1 ? "not-allowed" : "pointer",
            }}
          >
            ← Prev
          </button>

          <span
            style={{
              display: "flex",
              alignItems: "center",
              fontWeight: "bold",
              color: "#64748b",
            }}
          >
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages || loading}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              background: currentPage === totalPages ? "#e2e8f0" : "#3b82f6",
              color: currentPage === totalPages ? "#94a3b8" : "white",
              cursor: currentPage === totalPages ? "not-allowed" : "pointer",
            }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
