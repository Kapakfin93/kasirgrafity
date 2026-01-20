/**
 * OrderBoard Component
 * Production tracking board - PAGINATED VERSION
 * Role: PRODUCTION (can view & update status)
 */

import React, { useEffect, useState, useCallback } from "react";
import { useOrderStore } from "../../stores/useOrderStore";
import { usePermissions } from "../../hooks/usePermissions";
import { ORDER_STATUS, PAYMENT_STATUS } from "../../core/constants";
import { formatRupiah } from "../../core/formatters";
import { formatDateTime } from "../../utils/dateHelpers";
import { OrderCard } from "./OrderCard";

export function OrderBoard() {
  const {
    orders,
    filteredOrders,
    currentFilter,
    loading,
    error,
    // Pagination state
    currentPage,
    totalPages,
    totalOrders,
    searchQuery: storeSearchQuery,
    // Pagination actions
    loadOrders, // FIX: Supabase-based loader with items_snapshot
    loadOrdersPaginated,
    searchOrders,
    setFilterAndReload,
    nextPage,
    prevPage,
    goToPage,
    // Summary for counts
    summaryData,
    loadSummary,
  } = useOrderStore();

  const permissions = usePermissions();
  const canViewOrders = permissions.canViewOrders();
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | PENDING | IN_PROGRESS | READY
  const [localSearchQuery, setLocalSearchQuery] = useState("");

  // Load paginated orders on mount - USING SUPABASE (not Dexie)
  useEffect(() => {
    loadOrders({ page: 1, limit: 20, status: "ALL" }); // FIX: Use Supabase loader
    loadSummary(); // For status counts
  }, [loadOrders, loadSummary]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearchQuery !== storeSearchQuery) {
        searchOrders(localSearchQuery);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [localSearchQuery, storeSearchQuery, searchOrders]);

  // Handle payment filter change
  const handlePaymentFilter = useCallback(
    (status) => {
      setFilterAndReload(status);
    },
    [setFilterAndReload],
  );

  // Check permissions
  if (!canViewOrders) {
    return (
      <div className="access-denied">
        <h2>❌ Akses Ditolak</h2>
        <p>Anda tidak memiliki izin untuk melihat halaman ini.</p>
      </div>
    );
  }

  // Filter by production status (client-side since already paginated)
  const displayOrders = filteredOrders.filter((order) => {
    if (statusFilter !== "ALL" && order.productionStatus !== statusFilter) {
      return false;
    }
    return true;
  });

  // Get counts from summary data
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
            placeholder="🔍 Cari pesanan... (nama customer, ID)"
            value={localSearchQuery}
            onChange={(e) => setLocalSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="board-filters">
        {/* Payment Status Filter */}
        <div className="filter-group">
          <label>Status Pembayaran:</label>
          <div className="filter-buttons">
            <button
              className={`filter-btn ${currentFilter === "ALL" ? "active" : ""}`}
              onClick={() => handlePaymentFilter("ALL")}
            >
              Semua
            </button>
            <button
              className={`filter-btn unpaid ${currentFilter === "UNPAID" ? "active" : ""}`}
              onClick={() => handlePaymentFilter("UNPAID")}
            >
              Belum Bayar
            </button>
            <button
              className={`filter-btn dp ${currentFilter === "DP" ? "active" : ""}`}
              onClick={() => handlePaymentFilter("DP")}
            >
              DP
            </button>
            <button
              className={`filter-btn paid ${currentFilter === "PAID" ? "active" : ""}`}
              onClick={() => handlePaymentFilter("PAID")}
            >
              Lunas
            </button>
          </div>
        </div>

        {/* Production Status Filter */}
        <div className="filter-group">
          <label>Status Produksi:</label>
          <div className="filter-buttons">
            <button
              className={`filter-btn ${statusFilter === "ALL" ? "active" : ""}`}
              onClick={() => setStatusFilter("ALL")}
            >
              Semua
            </button>
            <button
              className={`filter-btn pending ${statusFilter === "PENDING" ? "active" : ""}`}
              onClick={() => setStatusFilter("PENDING")}
            >
              Pending ({counts.PENDING})
            </button>
            <button
              className={`filter-btn progress ${statusFilter === "IN_PROGRESS" ? "active" : ""}`}
              onClick={() => setStatusFilter("IN_PROGRESS")}
            >
              Dikerjakan ({counts.IN_PROGRESS})
            </button>
            <button
              className={`filter-btn ready ${statusFilter === "READY" ? "active" : ""}`}
              onClick={() => setStatusFilter("READY")}
            >
              Siap ({counts.READY})
            </button>
          </div>
        </div>
      </div>

      {/* Loading / Error State */}
      {loading && <div className="board-loading">⏳ Memuat data...</div>}
      {error && <div className="board-error">❌ Error: {error}</div>}

      {/* Order Cards Grid */}
      <div className="board-grid">
        {!loading && displayOrders.length === 0 && (
          <div className="board-empty">
            <p>📭 Tidak ada pesanan untuk ditampilkan.</p>
            {localSearchQuery && <p>Coba ubah kata kunci pencarian.</p>}
          </div>
        )}

        {displayOrders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </div>

      {/* === PAGINATION CONTROLS === */}
      {totalPages > 1 && !storeSearchQuery && (
        <div
          className="pagination-controls"
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "16px",
            padding: "24px",
            marginTop: "16px",
            background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
          }}
        >
          <button
            onClick={prevPage}
            disabled={currentPage === 1 || loading}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "none",
              background:
                currentPage === 1
                  ? "#e2e8f0"
                  : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              color: currentPage === 1 ? "#94a3b8" : "white",
              fontWeight: "bold",
              cursor: currentPage === 1 ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              boxShadow:
                currentPage === 1
                  ? "none"
                  : "0 2px 8px rgba(59, 130, 246, 0.3)",
            }}
          >
            ← Prev
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span style={{ color: "#64748b" }}>Page</span>
            <span
              style={{
                background: "white",
                padding: "8px 16px",
                borderRadius: "8px",
                fontWeight: "bold",
                color: "#1e293b",
                border: "1px solid #e2e8f0",
              }}
            >
              {currentPage}
            </span>
            <span style={{ color: "#64748b" }}>of</span>
            <span
              style={{
                fontWeight: "bold",
                color: "#1e293b",
              }}
            >
              {totalPages}
            </span>
          </div>

          <button
            onClick={nextPage}
            disabled={currentPage === totalPages || loading}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              border: "none",
              background:
                currentPage === totalPages
                  ? "#e2e8f0"
                  : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              color: currentPage === totalPages ? "#94a3b8" : "white",
              fontWeight: "bold",
              cursor: currentPage === totalPages ? "not-allowed" : "pointer",
              transition: "all 0.2s",
              boxShadow:
                currentPage === totalPages
                  ? "none"
                  : "0 2px 8px rgba(59, 130, 246, 0.3)",
            }}
          >
            Next →
          </button>
        </div>
      )}

      {/* Page info */}
      {totalOrders > 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "12px",
            color: "#64748b",
            fontSize: "14px",
          }}
        >
          Menampilkan {(currentPage - 1) * 20 + 1}-
          {Math.min(currentPage * 20, totalOrders)} dari{" "}
          {totalOrders.toLocaleString()} pesanan
        </div>
      )}
    </div>
  );
}
