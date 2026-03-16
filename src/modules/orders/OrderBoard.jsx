/**
 * OrderBoard Component (OPTIMIZED v2)
 * Production tracking board with Server-Side Filtering
 * Fixes: Pagination Logic, Dashboard Sync, & Dead Code Removal
 */

import React, { useEffect, useState, useRef } from "react";
import { useOrderStore } from "../../stores/useOrderStore";
import { usePermissions } from "../../hooks/usePermissions";
import { OrderCard } from "./OrderCard";
import WeekNavigator from "../../components/WeekNavigator"; // [NEW] Aggregator Component
import { db } from "../../data/db/schema";
import { CompletionModal } from "./CompletionModal"; // [PHASE 1] Elevated
import { ConfirmModal } from "../../components/ConfirmModal"; // [PHASE 2]
import { PromptModal } from "../../components/PromptModal"; // [PHASE 3]
import { formatRupiah } from "../../core/formatters"; // [PHASE 2]
import { useAuthStore } from "../../stores/useAuthStore";
import { AuditLogModal } from "../../components/AuditLogModal"; // [PHASE 4]
import { NotaPreview } from "../pos/NotaPreview"; // [PHASE 4]
import { WANotificationModal } from "../../components/WANotificationModal"; // [PHASE 4]

export function OrderBoard() {
  const {
    orders, // [RESTORED] Source of Truth
    loading,
    error,
    // Pagination state
    currentPage,
    totalOrders,
    searchQuery: storeSearchQuery,
    // Actions
    loadOrders,
    loadSummary, // PENTING: Untuk update Dashboard Owner
    manualRefreshOrders, // 🛡️ FITUR BARU: Manual Refresh
    loadOrdersByDateRange, // [NEW] Aggregator Action
    updateProductionStatus, // [PHASE 1]
    addPayment, // [PHASE 2]
    cancelOrder, // [PHASE 3]
  } = useOrderStore();

  const { user } = useAuthStore();

  const permissions = usePermissions();
  const canViewOrders = permissions.canViewOrders();

  // STATE LOKAL UNTUK FILTER (Client-Side Filtering)
  const [paymentFilter, setPaymentFilter] = useState("ALL");
  const [productionFilter, setProductionFilter] = useState("PENDING"); // [NEW] Default PENDING for operational focus
  const [localSearchQuery, setLocalSearchQuery] = useState("");

  // [NEW] AGGREGATOR STATE
  // Default ke WEEKLY agar Admin/Owner langsung dapat fitur baru
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem("orderBoard_viewMode") || "WEEKLY";
  });

  const [currentWeekRange, setCurrentWeekRange] = useState(null);

  // [PHASE 1 & 2] Unified Modal Elevation State (Single Source of Truth)
  const [activeModal, setActiveModal] = useState({ type: null, order: null });
  const [settlementReceiver, setSettlementReceiver] = useState("");

  // [PHASE 3] Operational Helper States
  const [spkOperator, setSpkOperator] = useState("");
  const [cancelData, setCancelData] = useState({
    reason: "",
    financialAction: "NONE",
  });

  // [PHASE 4] Viewer Config States
  const [modalConfig, setModalConfig] = useState({});

  // === VIRTUALIZATION / INFINITE SCROLL STATE ===
  const [visibleCount, setVisibleCount] = useState(20);
  const sentinelRef = useRef(null);
  const gridContainerRef = useRef(null);
  const observerRef = useRef(null);

  const openModal = (type, order, config = {}) => {
    setActiveModal({ type, order });
    setModalConfig(config);
    if (type === "PAYMENT") {
      setSettlementReceiver("");
    } else if (type === "SPK") {
      setSpkOperator("");
    } else if (type === "CANCEL_REASON") {
      setCancelData({ reason: "", financialAction: "NONE" });
    }
  };

  const closeModal = () => {
    setActiveModal({ type: null, order: null });
    setSettlementReceiver("");
    setSpkOperator("");
    setCancelData({ reason: "", financialAction: "NONE" });
    setModalConfig({});
  };

  const handleCompletionSubmit = async ({ orderId, status, evidence }) => {
    try {
      const actorName = user?.name || "Admin/Operator";
      await updateProductionStatus(orderId, status, actorName, {
        marketing_evidence_url: evidence?.url,
        is_public_content: evidence?.isPublic,
      });
      console.log("✅ Elevated Completion Success");
    } catch (err) {
      console.error("❌ Elevated Completion Failed:", err);
      throw err;
    }
  };

  const handleSettlementSubmit = async () => {
    const order = activeModal.order;
    if (!order) return;

    const sisa = order.remainingAmount || order.totalAmount - order.paidAmount;
    const finalReceiver = settlementReceiver.trim() || "Admin Pelunasan";

    try {
      await addPayment(order.id, sisa, finalReceiver);
      console.log("✅ Elevated Settlement Success");
      closeModal();
      // Optional: Trigger print check here if needed in Phase 2+
    } catch (err) {
      console.error("❌ Elevated Settlement Failed:", err);
      alert("Gagal pelunasan: " + err.message);
    }
  };

  // [PHASE 3] OPERATIONAL HANDLERS
  const handleSpkSubmit = async () => {
    const order = activeModal.order;
    if (!order) return;

    const operatorName = spkOperator.trim() || "Operator";
    try {
      await updateProductionStatus(order.id, "IN_PROGRESS", operatorName);
      console.log("✅ Elevated SPK Success");
      // [REGRESI FIX] Otomatis buka Nota SPK setelah proses
      openModal("NOTA", order, { printType: "SPK", autoPrint: true });
    } catch (err) {
      alert("❌ Gagal proses SPK: " + err.message);
    }
  };

  const handleWAStatusUpdate = async () => {
    const order = activeModal.order;
    const actionType = modalConfig.waAction;
    if (!order || !actionType) {
      closeModal();
      return;
    }

    try {
      const actorName = user?.name || "Admin/Operator";
      let targetStatus = null;

      if (actionType === "COMPLETE") targetStatus = "READY";
      if (actionType === "DELIVER") targetStatus = "DELIVERED";

      if (targetStatus) {
        await updateProductionStatus(order.id, targetStatus, actorName);
        console.log(`✅ Elevated WA Status Update Success: ${targetStatus}`);
      }

      closeModal();
    } catch (err) {
      console.error("❌ Elevated WA Status Update Failed:", err);
      alert("Gagal update status: " + err.message);
    }
  };

  const handleCancelReasonSubmit = (reason) => {
    const order = activeModal.order;
    if (!order) return;

    const amountPaid = order.paidAmount || 0;
    setCancelData((prev) => ({ ...prev, reason }));

    if (amountPaid > 0) {
      setActiveModal({ type: "CANCEL_FINANCIAL", order });
    } else {
      setActiveModal({ type: "CANCEL_FINAL", order });
    }
  };

  const handleFinancialRefund = () => {
    setCancelData((prev) => ({ ...prev, financialAction: "REFUND" }));
    setActiveModal((prev) => ({ ...prev, type: "CANCEL_FINAL" }));
  };

  const handleFinancialForfeit = () => {
    setCancelData((prev) => ({ ...prev, financialAction: "FORFEIT" }));
    setActiveModal((prev) => ({ ...prev, type: "CANCEL_FINAL" }));
  };

  const handleCancelExecution = async () => {
    const order = activeModal.order;
    if (!order) return;

    try {
      await cancelOrder(
        order.id,
        cancelData.reason.trim(),
        cancelData.financialAction,
        user?.name || "Operator"
      );
      console.log("✅ Elevated Cancellation Success");
      closeModal();
    } catch (err) {
      alert("❌ Gagal batal order: " + err.message);
    }
  };

  // === REFS: Capture nilai terkini tanpa trigger re-render ===
  const filtersRef = useRef({ currentPage, paymentFilter, productionFilter });
  const searchRef = useRef({ storeSearchQuery, localSearchQuery });

  // Sync refs setiap kali nilai berubah
  useEffect(() => {
    filtersRef.current = { currentPage, paymentFilter, productionFilter };
  }, [currentPage, paymentFilter, productionFilter]);

  useEffect(() => {
    searchRef.current = { storeSearchQuery, localSearchQuery };
  }, [storeSearchQuery, localSearchQuery]);

  // Persist View Mode
  useEffect(() => {
    localStorage.setItem("orderBoard_viewMode", viewMode);
  }, [viewMode]);

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
    // [DECOUPLED] We now use Pure Client-Side filter, so we always load data

    if (viewMode === "WEEKLY" && currentWeekRange) {
      // [NEW] Load Aggregator Logic
      loadOrdersByDateRange(currentWeekRange.start, currentWeekRange.end);
    } else {
      // Default: Load Pagination Logic (Fetching ALL for In-Memory Filter)
      loadOrders({
        page: currentPage,
        limit: 50, // [OVERRIDE] Limit 50
        paymentStatus: "ALL",
        productionStatus: "ALL",
      });
    }

    // REFRESH DASHBOARD JUGA (Agar Net Profit Owner Update!)
    loadSummary();
  }, [
    currentPage,
    loadOrders,
    loadSummary,
    storeSearchQuery,
    viewMode,
    currentWeekRange, // [NEW] Trigger re-fetch when week changes
    loadOrdersByDateRange,
  ]);

  // [PHASE 2] AUTO-SYNC INTERVAL (30 Minutes) — Stable via useRef
  // Interval TIDAK pernah di-recreate. Refs baca nilai terkini.
  useEffect(() => {
    const intervalId = setInterval(async () => {
      console.log(
        `[${new Date().toLocaleTimeString()}] ⏰ Auto-Sync Initiated`,
      );

      // 🛡️ RACE CONDITION GUARD: Baca dari ref (nilai terkini)
      const { storeSearchQuery: sq, localSearchQuery: lq } = searchRef.current;
      if (!sq && !lq) {
        console.time("Auto-Sync Duration");
        try {
          const {
            currentPage: cp,
            paymentFilter: pf,
            productionFilter: prf,
          } = filtersRef.current;
          console.log("🔄 Auto-Sync: Fetching Orders...");
          await loadOrders({
            page: cp,
            limit: 50, // [OVERRIDE] Limit 50
            paymentStatus: pf,
            productionStatus: prf,
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
        console.warn("⏸️ Auto-Sync Paused: User is searching");
      }
    }, 1800000); // 30 Menit

    return () => {
      console.log("🧹 Auto-Sync Interval Cleared.");
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Stable — tidak pernah di-reset

  // === 3. FILTER HANDLERS (PURE CLIENT-SIDE) ===
  const handlePaymentFilter = (status) => {
    setPaymentFilter(status);
  };

  const handleProductionFilter = (status) => {
    setProductionFilter(status);
  };

  // [DYNAMIC COUNTER] Hitung jumlah pesanan secara reaktif dari Memori (Zustand)
  const counts = {
    PENDING: orders.filter((o) => o.productionStatus === "PENDING").length,
    IN_PROGRESS: orders.filter((o) => o.productionStatus === "IN_PROGRESS")
      .length,
    READY: orders.filter((o) => o.productionStatus === "READY").length,
  };

  // Sprint 2: Filter tidak berlaku di WEEKLY mode — disable agar tidak menyesatkan
  const isFilterDisabled = viewMode === "WEEKLY";

  // === 5. PURE CLIENT-SIDE FILTERING (IN-MEMORY) ===
  const displayOrders = orders.filter((order) => {
    // A. Filter Status Pembayaran
    const matchPayment =
      paymentFilter === "ALL" || order.paymentStatus === paymentFilter;

    // B. Filter Status Produksi
    const matchProduction =
      productionFilter === "ALL" || order.productionStatus === productionFilter;

    // C. Filter Pencarian Teks (Case-Insensitive & Safety Check)
    const searchLower = localSearchQuery.toLowerCase().trim();
    const matchSearch =
      !searchLower ||
      order.customerName?.toLowerCase().includes(searchLower) ||
      order.orderNumber?.toLowerCase().includes(searchLower) ||
      order.items?.some((item) =>
        item.productName?.toLowerCase().includes(searchLower),
      );

    return matchPayment && matchProduction && matchSearch;
  });

  // [VIRTUALIZATION] Final Slice — Matang di akhir
  const visibleOrders = displayOrders.slice(0, visibleCount);

  // [VIRTUALIZATION] Reset & Scroll Logic
  useEffect(() => {
    setVisibleCount(20);
    // Force scroll container ke atas saat filter berubah
    if (gridContainerRef.current) {
      gridContainerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [paymentFilter, productionFilter, localSearchQuery]);

  // [VIRTUALIZATION] Intersection Observer Logic
  useEffect(() => {
    // Cleanup previous observer
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          console.log("📍 Sentinel reached: Loading 20 more cards...");
          setVisibleCount((prev) => prev + 20);
        }
      },
      { threshold: 0.1 }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [displayOrders.length]); // Re-observe when dataset changes

  // Check permissions
  if (!canViewOrders) {
    return (
      <div className="access-denied">
        <h2>❌ Akses Ditolak</h2>
        <p>Anda tidak memiliki izin untuk melihat halaman ini.</p>
      </div>
    );
  }

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
      <div
        className="board-filters"
        style={isFilterDisabled ? { opacity: 0.4, pointerEvents: "none" } : {}}
      >
        {/* Label info saat WEEKLY mode */}
        {isFilterDisabled && (
          <div
            style={{
              fontSize: "11px",
              color: "#94a3b8",
              marginBottom: "6px",
              fontStyle: "italic",
            }}
          >
            Filter tidak aktif di mode Mingguan
          </div>
        )}
        {/* Payment Filter */}
        <div className="filter-group">
          <label>Status Pembayaran:</label>
          <div className="filter-buttons">
            {["ALL", "UNPAID", "PARTIAL", "PAID"].map((status) => (
              <button
                key={status}
                disabled={isFilterDisabled}
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
              disabled={isFilterDisabled}
              className={`filter-btn ${productionFilter === "ALL" ? "active" : ""}`}
              onClick={() => handleProductionFilter("ALL")}
            >
              Semua
            </button>
            <button
              disabled={isFilterDisabled}
              className={`filter-btn pending ${productionFilter === "PENDING" ? "active" : ""}`}
              onClick={() => handleProductionFilter("PENDING")}
            >
              Pending ({counts.PENDING})
            </button>
            <button
              disabled={isFilterDisabled}
              className={`filter-btn progress ${productionFilter === "IN_PROGRESS" ? "active" : ""}`}
              onClick={() => handleProductionFilter("IN_PROGRESS")}
            >
              Dikerjakan ({counts.IN_PROGRESS})
            </button>
            <button
              disabled={isFilterDisabled}
              className={`filter-btn ready ${productionFilter === "READY" ? "active" : ""}`}
              onClick={() => handleProductionFilter("READY")}
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
      <div 
        ref={gridContainerRef}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {visibleOrders.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-gray-800 rounded-xl border border-gray-700">
            <p className="text-gray-400">
              {loading ? "Memuat pesanan..." : "Belum ada pesanan yang sesuai filter."}
            </p>
          </div>
        ) : (
          <>
            {visibleOrders.map((order) => (
              <OrderCard 
                key={order.ref_local_id || order.id} 
                order={order} 
                onOpenModal={openModal}
              />
            ))}
            
            {/* [VIRTUALIZATION] Sentinel Element - Trigger Load More */}
            {displayOrders.length > visibleCount && (
              <div 
                ref={sentinelRef} 
                className="col-span-full h-20 flex items-center justify-center text-gray-500 italic"
              >
                Memuat lebih banyak pesanan...
              </div>
            )}
          </>
        )}
      </div>

      {/* [PHASE 1 & 2] ELEVATED MODALS (Single Source of Truth) */}
      
      {/* 1. COMPLETION MODAL */}
      <CompletionModal
        key={activeModal.type === "COMPLETION" ? activeModal.order?.id : "closed"}
        isOpen={activeModal.type === "COMPLETION"}
        order={activeModal.order}
        onClose={closeModal}
        onSubmit={handleCompletionSubmit}
        isOffline={!navigator.onLine}
      />

      {/* 2. SETTLEMENT (PAYMENT) MODAL */}
      {activeModal.type === "PAYMENT" && activeModal.order && (
        <ConfirmModal
          isOpen={true}
          title="💸 Konfirmasi Pelunasan"
          message={
            <div>
              <p style={{ marginBottom: "8px" }}>Terima pelunasan sebesar:</p>
              <p
                style={{
                  fontSize: "24px",
                  fontWeight: "bold",
                  color: "#22c55e",
                  margin: "12px 0",
                }}
              >
                {formatRupiah(
                  activeModal.order.remainingAmount || 
                  activeModal.order.totalAmount - (activeModal.order.paidAmount || 0),
                )}
              </p>
              <p style={{ fontSize: "12px", color: "#94a3b8" }}>
                Order: {activeModal.order.orderNumber}
              </p>
              <div style={{ marginTop: "16px", textAlign: "left" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: "bold",
                    marginBottom: "4px",
                    color: "#475569",
                  }}
                >
                  Diterima Oleh:
                </label>
                <input
                  type="text"
                  placeholder="Nama Kasir / Penerima..."
                  value={settlementReceiver}
                  onChange={(e) => setSettlementReceiver(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    fontSize: "14px",
                    backgroundColor: "white",
                    color: "black"
                  }}
                  autoFocus
                />
              </div>
            </div>
          }
          confirmText="Ya, Terima"
          cancelText="Batal"
          confirmColor="#22c55e"
          onConfirm={handleSettlementSubmit}
          onCancel={closeModal}
        />
      )}

      {/* 3. SPK MODAL */}
      {activeModal.type === "SPK" && activeModal.order && (
        <ConfirmModal
          isOpen={true}
          title="🖨️ Proses Produksi (SPK)"
          message={
            <div>
              <p style={{ marginBottom: "12px", color: "#4b5563" }}>
                Order akan ditandai <strong>IN PROGRESS</strong> dan SPK akan dicetak.
              </p>
              <div style={{ marginTop: "16px", textAlign: "left" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "12px",
                    fontWeight: "bold",
                    marginBottom: "4px",
                    color: "#374151",
                  }}
                >
                  Operator / Penanggung Jawab:
                </label>
                <input
                  type="text"
                  placeholder="Cth: Budi, Asep, dll..."
                  value={spkOperator}
                  onChange={(e) => setSpkOperator(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    border: "1px solid #93c5fd",
                    borderRadius: "6px",
                    fontSize: "14px",
                    backgroundColor: "white",
                    color: "black"
                  }}
                  autoFocus
                />
              </div>
            </div>
          }
          confirmText="🚀 Proses Sekarang"
          cancelText="Batal"
          confirmColor="#3b82f6"
          onConfirm={handleSpkSubmit}
          onCancel={closeModal}
        />
      )}

      {/* 4. CANCEL REASON MODAL */}
      {activeModal.type === "CANCEL_REASON" && activeModal.order && (
        <PromptModal
          isOpen={true}
          title="🛑 Pembatalan Order"
          message={`Anda akan membatalkan order: ${activeModal.order.orderNumber}`}
          placeholder="Masukkan alasan pembatalan..."
          submitText="Lanjutkan"
          submitColor="#ef4444"
          onSubmit={handleCancelReasonSubmit}
          onCancel={closeModal}
          required={true}
        />
      )}

      {/* 5. CANCEL FINANCIAL AUDIT */}
      {activeModal.type === "CANCEL_FINANCIAL" && activeModal.order && (
        <ConfirmModal
          isOpen={true}
          title="⚠️ Uangnya Mau Diapakan?"
          message={
            <div>
              <p style={{ marginBottom: "12px" }}>Order ini sudah ada uang masuk:</p>
              <p style={{ fontSize: "20px", fontWeight: "bold", color: "#f59e0b", margin: "8px 0" }}>
                {formatRupiah(activeModal.order.paidAmount || 0)}
              </p>
              <p style={{ marginTop: "16px", padding: "12px", background: "#f8fafc", borderRadius: "8px", fontSize: "13px", color: "#475569" }}>
                Karena batal, uang ini mau:
              </p>
            </div>
          }
          confirmText="💸 Kembalikan ke Pelanggan"
          cancelText="🔒 Masuk Kas Toko (Hangus)"
          confirmColor="#f59e0b"
          onConfirm={handleFinancialRefund}
          onCancel={handleFinancialForfeit}
        />
      )}

      {/* 6. CANCEL FINAL CONFIRMATION */}
      {activeModal.type === "CANCEL_FINAL" && activeModal.order && (
        <ConfirmModal
          isOpen={true}
          title="⚠️ Konfirmasi Akhir"
          message={
            <div style={{ textAlign: "left" }}>
              <p style={{ marginBottom: "12px", fontWeight: "bold" }}>Ringkasan Pembatalan:</p>
              <div style={{ padding: "12px", background: "#fef2f2", borderRadius: "8px", border: "1px solid #fecaca", fontSize: "13px" }}>
                <p><strong>Order:</strong> {activeModal.order.orderNumber}</p>
                <p><strong>Alasan:</strong> "{cancelData.reason}"</p>
                <p>
                  <strong>Status Dana:</strong>{" "}
                  {cancelData.financialAction === "REFUND"
                    ? "💸 Dikembalikan"
                    : cancelData.financialAction === "FORFEIT"
                      ? "🔥 Hangus"
                      : "- Tidak ada"}
                </p>
              </div>
            </div>
          }
          confirmText="Ya, Batalkan Order"
          cancelText="Tidak Jadi"
          confirmColor="#dc2626"
          onConfirm={handleCancelExecution}
          onCancel={closeModal}
        />
      )}

      {/* 7. AUDIT LOG MODAL (PHASE 4) */}
      <AuditLogModal
        isOpen={activeModal.type === "AUDIT"}
        onClose={closeModal}
        orderId={activeModal.order?.id}
        localId={activeModal.order?.ref_local_id}
        orderNumber={activeModal.order?.orderNumber || String(activeModal.order?.id)}
      />

      {/* 8. NOTA PREVIEW MODAL (PHASE 4) */}
      {activeModal.type === "NOTA" && activeModal.order && (
        <NotaPreview
          items={activeModal.order.items}
          totalAmount={activeModal.order.totalAmount}
          paymentState={{
            amountPaid: activeModal.order.paidAmount,
            mode: activeModal.order.paymentStatus === "PAID" ? "LUNAS" : "PARTIAL",
          }}
          order={activeModal.order}
          type={modalConfig.printType || "NOTA"}
          autoPrint={modalConfig.autoPrint || false}
          onClose={closeModal}
          onPrint={null} // NotaPreview handles internal thermal print better
        />
      )}

      {/* 9. WA NOTIFICATION MODAL (PHASE 4) */}
      <WANotificationModal
        isOpen={activeModal.type === "WA"}
        order={activeModal.order}
        actionType={modalConfig.waAction}
        onConfirmWithWA={handleWAStatusUpdate}
        onConfirmSilent={handleWAStatusUpdate}
        onCancel={closeModal}
      />
    </div>
  );
}
