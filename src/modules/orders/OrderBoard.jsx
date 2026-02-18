/**
 * OrderBoard Component (OPTIMIZED v2)
 * Production tracking board with Server-Side Filtering
 * Fixes: Pagination Logic, Dashboard Sync, & Dead Code Removal
 */

import React, { useEffect, useState } from "react";
import { useOrderStore } from "../../stores/useOrderStore";
import { usePermissions } from "../../hooks/usePermissions";
import { OrderCard } from "./OrderCard";
import WeekNavigator from "../../components/WeekNavigator"; // [NEW] Aggregator Component
import { db } from "../../data/db/schema";

export function OrderBoard() {
  const {
    orders, // [RESTORED] Source of Truth
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
    manualRefreshOrders, // 🛡️ FITUR BARU: Manual Refresh
    loadOrdersByDateRange, // [NEW] Aggregator Action
  } = useOrderStore();

  const permissions = usePermissions();
  const canViewOrders = permissions.canViewOrders();

  // STATE LOKAL UNTUK FILTER (Server-Side Trigger)
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [productionFilter, setProductionFilter] = useState("ALL");
  const [localSearchQuery, setLocalSearchQuery] = useState("");

  // [NEW] AGGREGATOR STATE
  const [viewMode, setViewMode] = useState("LIST"); // LIST | WEEKLY
  const [currentWeekRange, setCurrentWeekRange] = useState(null);

  // === REACTIVE STORE INTEGRATION (HEARTBEAT RESTORED) ===

  // 🕵️ MULAI: CCTV STORAGE HEALTH (Background Check)
  useEffect(() => {
    const checkStorageHealth = async () => {
      try {
        if (!db || !db.orders) return;
        const count = await db.orders.count();
        const estimate = await navigator.storage?.estimate();

        console.log("📊 [CCTV SERVER] Storage Health:", {
          totalOrdersLokal: count,
          terpakai: (estimate?.usage / 1024 / 1024).toFixed(2) + " MB",
          kapasitasMaksimal: (estimate?.quota / 1024 / 1024).toFixed(2) + " MB",
        });
      } catch (err) {
        console.warn("⚠️ Gagal mengecek kapasitas storage:", err);
      }
    };
    checkStorageHealth();
  }, []);
  // 🏁 SELESAI: CCTV STORAGE HEALTH

  // [PHASE 1] Restore Heartbeat Download
  useEffect(() => {
    // Jika sedang searching, jangan load paginated biasa (biarkan fungsi searchOrders yg kerja)
    if (storeSearchQuery) return;

    if (viewMode === "WEEKLY" && currentWeekRange) {
      // [NEW] Load Aggregator Logic
      loadOrdersByDateRange(currentWeekRange.start, currentWeekRange.end);
    } else {
      // Default: Load Pagination Logic
      loadOrders({
        page: currentPage,
        limit: 20,
        paymentStatus: paymentFilter,
        productionStatus: productionFilter,
      });
    }

    // REFRESH DASHBOARD JUGA (Agar Net Profit Owner Update!)
    loadSummary();
  }, [
    currentPage,
    paymentFilter,
    productionFilter,
    loadOrders,
    loadSummary,
    storeSearchQuery,
    viewMode,
    currentWeekRange, // [NEW] Trigger re-fetch when week changes
    loadOrdersByDateRange,
  ]);

  // Keep Sync Trigger for Dashboard only (Optional)
  // Keep Sync Trigger for Dashboard only (Optional)
  // [PHASE 2] AUTO-SYNC INTERVAL (30 Minutes)
  useEffect(() => {
    // Initial Load
    loadSummary();

    // Setup Interval: 30 Menit = 30 * 60 * 1000 = 1,800,000 ms
    // Setup Interval: 30 Menit = 30 * 60 * 1000 = 1,800,000 ms
    const intervalId = setInterval(async () => {
      console.log(
        `[${new Date().toLocaleTimeString()}] ⏰ Auto-Sync Initiated`,
      );

      // 🛡️ RACE CONDITION GUARD:
      // Jangan refresh jika user sedang mengetik search!
      if (!storeSearchQuery && !localSearchQuery) {
        console.time("Auto-Sync Duration");
        try {
          console.log("🔄 Auto-Sync: Fetching Orders...");
          await loadOrders({
            page: currentPage,
            limit: 20,
            paymentStatus: paymentFilter,
            productionStatus: productionFilter,
          });

          console.log("🔄 Auto-Sync: Fetching Summary...");
          await loadSummary();

          console.log("✅ Auto-Sync Completed Successfully");
        } catch (err) {
          console.error("❌ Auto-Sync Failed:", err);
        } finally {
          console.timeEnd("Auto-Sync Duration");
        }
      } else {
        console.warn(
          `⏸️ Auto-Sync Paused: User is searching (Store: "${storeSearchQuery}", Local: "${localSearchQuery}")`,
        );
      }
    }, 1800000); // 30 Menit

    // CLEANUP PROTOCOL
    return () => {
      console.log("🧹 Auto-Sync Interval Cleared.");
      clearInterval(intervalId);
    };
  }, [
    currentPage,
    paymentFilter,
    productionFilter,
    storeSearchQuery,
    localSearchQuery,
    loadOrders,
    loadSummary,
  ]);

  // === 2. SEARCH HANDLER (Debounce) ===
  // Still useful for updating UI state, providing search query param
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

        {/* [NEW] VIEW SWITCHER */}
        <div className="flex bg-slate-100 rounded-lg p-1 mr-4 border border-slate-300">
          <button
            onClick={() => setViewMode("LIST")}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${viewMode === "LIST" ? "bg-white shadow text-blue-700" : "text-slate-500 hover:text-slate-700"}`}
          >
            📋 List View
          </button>
          <button
            onClick={() => setViewMode("WEEKLY")}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${viewMode === "WEEKLY" ? "bg-white shadow text-blue-700" : "text-slate-500 hover:text-slate-700"}`}
          >
            📊 Mingguan
          </button>
        </div>

        {/* 🛡️ FITUR BARU: TOMBOL REFRESH MANUAL */}
        <button
          onClick={manualRefreshOrders}
          disabled={loading}
          style={{
            marginLeft: "auto",
            marginRight: "10px",
            height: "40px",
            padding: "0 20px",
            background: loading ? "#94a3b8" : "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: loading ? "wait" : "pointer",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          {loading ? "⏳ Syncing..." : "🔄 Refresh Data"}
        </button>

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

      {/* [NEW] WEEK NAVIGATOR (Visible only in WEEKLY mode) */}
      {viewMode === "WEEKLY" && (
        <WeekNavigator onWeekChange={(range) => setCurrentWeekRange(range)} />
      )}

      {/* Filters Area */}
      <div className="board-filters">
        {/* Payment Filter */}
        <div className="filter-group">
          <label>Status Pembayaran:</label>
          <div className="filter-buttons">
            {["ALL", "UNPAID", "PARTIAL", "PAID"].map((status) => (
              <button
                key={status}
                className={`filter-btn ${status.toLowerCase()} ${paymentFilter === status ? "active" : ""}`}
                onClick={() => handlePaymentFilter(status)}
              >
                {status === "ALL"
                  ? "Semua"
                  : status === "UNPAID"
                    ? "Belum Bayar"
                    : status === "PARTIAL"
                      ? "DP"
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {orders.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-gray-800 rounded-xl border border-gray-700">
            <p className="text-gray-400">
              {loading ? "Memuat pesanan..." : "Belum ada pesanan."}
            </p>
          </div>
        ) : (
          orders.map((order) => (
            <OrderCard key={order.ref_local_id || order.id} order={order} />
          ))
        )}
      </div>
      {/* === PAGINATION CONTROLS === */}
      {/* Tampilkan pagination jika bukan mode search DAN total halaman > 1 DAN Mode LIST */}
      {!storeSearchQuery && viewMode === "LIST" && totalPages > 1 && (
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
