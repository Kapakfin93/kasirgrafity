/**
 * src/modules/dashboard/OwnerDashboard.jsx
 * OWNER DASHBOARD (V6 - HYBRID RESTORED)
 * Features:
 * 1. UI RESTORED: Date Filters (Today/Week/Month), Operational Cards, Cancelled Log.
 * 2. LOGIC UPGRADED: Financials feed from Core (OwnerDecisionEngine) for accuracy.
 */

import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useOrderStore } from "../../stores/useOrderStore";
import { useEmployeeStore } from "../../stores/useEmployeeStore";
import { useAttendanceStore } from "../../stores/useAttendanceStore";
import { useExpenseStore } from "../../stores/useExpenseStore";
import { usePermissions } from "../../hooks/usePermissions";

import { formatRupiah } from "../../core/formatters";
import { getDateRange } from "../../utils/dateHelpers";
import { StatsCard } from "./StatsCard";
import { RecentOrders } from "./RecentOrders";
import { TodayAttendance } from "./TodayAttendance";
import { TopProducts } from "./TopProducts";
import { HistoryModal } from "../pos/HistoryModal";
import { OwnerActionPanel } from "../../components/dashboard/OwnerActionPanel";

// IMPORT MESIN PINTAR (CORE)
import { getOwnerDailySnapshot } from "../../core/ownerDecisionEngine";
import { resolveActionsFromSnapshot } from "../../core/ownerActionResolver";

export function OwnerDashboard() {
  const navigate = useNavigate();
  const { isOwner } = usePermissions();

  // 1. KEMBALIKAN STATE FILTER WAKTU
  const [period, setPeriod] = useState("today");

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isActionPanelOpen, setIsActionPanelOpen] = useState(false);

  // STATE INTELEJEN (CORE)
  const [coreData, setCoreData] = useState(null);
  const [actions, setActions] = useState([]);
  const [isLoadingCore, setIsLoadingCore] = useState(true);

  // STORE (Untuk Data Operasional & List Table)
  const { orders, loadOrders, summaryData, loadSummary } = useOrderStore();
  const { employees, loadEmployees, getActiveEmployees } = useEmployeeStore();
  const { todayAttendances, loadTodayAttendances, syncFromCloud } =
    useAttendanceStore();
  const { expenses, loadExpenses } = useExpenseStore();

  // === LOAD DATA ===
  useEffect(() => {
    const { start, end } = getDateRange(period);

    // A. Load Data Store (Untuk Grafik Produksi, List Order, dll)
    loadOrders({ page: 1, limit: 50 });
    loadSummary({ start, end }); // Tetap load ini untuk data operasional
    loadEmployees();
    loadTodayAttendances();
    syncFromCloud(); // [NEW] Smart Sync (Throttled 1 min) - Fix Attendance Gap
    loadExpenses();

    // B. Load Data Intelijen (Untuk Keuangan Akurat)
    // Core snapshot didesain untuk "Hari Ini".
    // Jika filter bukan hari ini, kita andalkan Store lama sementara.
    if (period === "today") {
      fetchCoreIntelligence();
    } else {
      setCoreData(null); // Reset core data jika bukan hari ini
    }
  }, [period]);

  const fetchCoreIntelligence = async () => {
    setIsLoadingCore(true);
    try {
      const snapshot = await getOwnerDailySnapshot();
      if (snapshot.success) {
        setCoreData(snapshot);
        const resolvedActions = resolveActionsFromSnapshot(snapshot);
        setActions(resolvedActions);
      }
    } catch (error) {
      console.error("Core Intelligence Error:", error);
    } finally {
      setIsLoadingCore(false);
    }
  };

  // === 2. HITUNG PENGELUARAN (EXPENSE - FIXED WITH DATE FILTER) ===
  const totalExpenses = useMemo(() => {
    const { start, end } = getDateRange(period); // Ambil rentang waktu dari tombol filter

    return expenses
      .filter((e) => {
        if (!e.date) return false; // Abaikan jika tidak ada tanggal
        const expenseDate = new Date(e.date);
        // Lolos jika tanggal pengeluaran ada di antara Start dan End
        return expenseDate >= start && expenseDate <= end;
      })
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [expenses, period]); // Hitung ulang hanya jika data expense atau periode berubah

  // === MAPPING DATA (HYBRID STRATEGY) ===
  // Jika Period = TODAY, pakai CORE (Akurat). Jika tidak, pakai STORE (Estimasi).
  const useCore = period === "today" && coreData;

  const totalSales = useCore
    ? coreData.today.newOrdersAmount
    : summaryData.totalSales || 0;
  const totalCollected = useCore
    ? coreData.today.paymentsAmount
    : summaryData.totalCollected || 0;
  // Total Outstanding selalu ambil real-time dari Core jika ada (karena piutang tidak kenal tanggal)
  const totalOutstanding =
    coreData?.receivables?.total || summaryData.totalOutstanding || 0;

  const netProfit = totalCollected - totalExpenses;

  // Breakdown Piutang (Dari Core jika ada)
  const receivableMacet = coreData?.receivables?.overdue?.total || 0;

  // Data List Order (Operational)
  const activeOrders = orders
    .filter((o) => o.productionStatus !== "CANCELLED")
    .slice(0, 50);
  const cancelledOrders = orders
    .filter((o) => o.productionStatus === "CANCELLED")
    .slice(0, 20);

  if (!isOwner) return <div className="p-4 text-red-500">Akses Ditolak</div>;

  return (
    <div className="owner-dashboard">
      {/* HEADER COMMAND CENTER */}
      <div className="command-center-header">
        <div className="animated-border" />

        {/* Kiri: Identitas */}
        <div
          className="header-identity"
          style={{ display: "flex", gap: "12px", alignItems: "center" }}
        >
          <span className="header-icon">📈</span>
          <div>
            <h1 className="header-title">Dashboard Owner</h1>
          </div>
          <button
            onClick={() => setIsHistoryOpen(true)}
            style={{
              padding: "8px 16px",
              background: "linear-gradient(135deg, #8b5cf6, #a78bfa)",
              border: "1px solid rgba(139, 92, 246, 0.3)",
              borderRadius: "8px",
              color: "white",
              fontSize: "13px",
              fontWeight: "700",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>📜</span>
            <span>Detail</span>
          </button>
        </div>

        {/* Tengah: NET PROFIT LIVE */}
        <div className="burning-core">
          <div className="core-label">CASHFLOW BERSIH</div>
          <div className={`core-value ${netProfit >= 0 ? "profit" : "loss"}`}>
            {period === "today" && isLoadingCore
              ? "..."
              : formatRupiah(netProfit)}
          </div>
          <div className="core-status">
            {netProfit >= 0 ? "🔥 Surplus" : "❄️ Defisit"}
          </div>
        </div>

        {/* Kanan: RESTORED FILTER BUTTONS */}
        <div className="capsule-filter">
          <button
            className={`capsule-btn ${period === "today" ? "active" : ""}`}
            onClick={() => setPeriod("today")}
          >
            Hari Ini
          </button>
          <button
            className={`capsule-btn ${period === "week" ? "active" : ""}`}
            onClick={() => setPeriod("week")}
          >
            7 Hari
          </button>
          <button
            className={`capsule-btn ${period === "month" ? "active" : ""}`}
            onClick={() => setPeriod("month")}
          >
            Bulan Ini
          </button>
        </div>
      </div>

      {/* === TIER 1: KEUANGAN UTAMA === */}
      <div className="stats-grid-5">
        <StatsCard
          icon="💰"
          title="Total Penjualan"
          value={formatRupiah(totalSales)}
          subtitle={useCore ? "Data Real-time Core" : "Data Akumulasi Store"}
          color="#22c55e"
        />
        <StatsCard
          icon="💵"
          title="Uang Masuk"
          value={formatRupiah(totalCollected)}
          subtitle="Cash In Hand"
          color="#3b82f6"
        />

        {/* Action Panel Button Restored */}
        <div style={{ position: "relative" }}>
          <StatsCard
            icon="⚠️"
            title="Total Tagihan"
            value={formatRupiah(totalOutstanding)}
            subtitle={
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>
                  {receivableMacet > 0
                    ? `Macet: ${formatRupiah(receivableMacet)}`
                    : "Aman"}
                </span>
                {actions.length > 0 && (
                  <button
                    onClick={() => setIsActionPanelOpen(true)}
                    style={{
                      padding: "2px 6px",
                      background: "rgba(239,68,68,0.2)",
                      color: "#ef4444",
                      borderRadius: "4px",
                      fontSize: "10px",
                      fontWeight: "bold",
                      cursor: "pointer",
                      border: "1px solid rgba(239,68,68,0.5)",
                    }}
                  >
                    {actions.length} Aksi
                  </button>
                )}
              </div>
            }
            color={receivableMacet > 0 ? "#ef4444" : "#64748b"}
          />
        </div>

        <StatsCard
          icon="🎟️"
          title="Total Diskon"
          value={formatRupiah(summaryData.totalDiscount)}
          subtitle="Potongan Harga"
          color="#f59e0b"
        />
        <StatsCard
          icon="💸"
          title="Pengeluaran"
          value={formatRupiah(totalExpenses)}
          subtitle="Klik detail →"
          color="#f43f5e"
          isClickable={true}
          onClick={() => navigate("/expenses")}
        />
      </div>

      {/* === TIER 2: REVENUE BREAKDOWN (STORE DATA) === */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "16px",
          marginTop: "16px",
        }}
      >
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)",
            borderRadius: "16px",
            padding: "20px",
            borderLeft: "4px solid #06b6d4",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "32px" }}>🖨️</span>
            <div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "700",
                  color: "#64748b",
                }}
              >
                OMSET BAHAN
              </div>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "800",
                  color: "#22d3ee",
                }}
              >
                {formatRupiah(summaryData.omsetBahan || 0)}
              </div>
            </div>
          </div>
        </div>
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)",
            borderRadius: "16px",
            padding: "20px",
            borderLeft: "4px solid #8b5cf6",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "32px" }}>✨</span>
            <div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "700",
                  color: "#64748b",
                }}
              >
                OMSET JASA
              </div>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "800",
                  color: "#8b5cf6",
                }}
              >
                {formatRupiah(summaryData.omsetJasa || 0)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* === TIER 3: RESTORED OPERATIONAL STATS === */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "16px",
          marginTop: "16px",
        }}
      >
        <StatsCard
          icon="⏳"
          title="Pesanan Pending"
          value={summaryData.countByProductionStatus?.PENDING || 0}
          subtitle={`Dikerjakan: ${summaryData.countByProductionStatus?.IN_PROGRESS || 0}`}
          color="#f59e0b"
        />
        <StatsCard
          icon="✅"
          title="Siap Diambil"
          value={summaryData.countByProductionStatus?.READY || 0}
          subtitle={`Terkirim: ${summaryData.countByProductionStatus?.DELIVERED || 0}`}
          color="#8b5cf6"
        />
      </div>

      {/* === RESTORED SECONDARY STATS === */}
      <div className="secondary-stats-grid">
        <div className="stat-card stat-card-danger">
          <div className="stat-card-label">🔴 Belum Bayar</div>
          <div className="stat-card-value">
            {summaryData.countByPaymentStatus?.UNPAID || 0}
          </div>
        </div>
        <div className="stat-card stat-card-warning">
          <div className="stat-card-label">🟡 DP (Cicilan)</div>
          <div className="stat-card-value">
            {summaryData.countByPaymentStatus?.DP || 0}
          </div>
        </div>
        <div className="stat-card stat-card-success">
          <div className="stat-card-label">🟢 Lunas</div>
          <div className="stat-card-value">
            {summaryData.countByPaymentStatus?.PAID || 0}
          </div>
        </div>
      </div>

      {/* === CONTENT GRID === */}
      <div className="dashboard-widgets">
        <div className="widget-card">
          <h2 className="widget-title">📋 Pesanan Terbaru</h2>
          <RecentOrders orders={activeOrders.slice(0, 5)} />
        </div>
        <div className="widget-card">
          <h2 className="widget-title">🏆 Produk Terlaris</h2>
          <TopProducts orders={activeOrders} />
        </div>
        {employees.length > 0 && (
          <div className="widget-card">
            <h2 className="widget-title">⏰ Absensi Hari Ini</h2>
            <TodayAttendance
              attendances={todayAttendances}
              employees={getActiveEmployees()}
            />
          </div>
        )}
      </div>

      {/* === RESTORED CANCELLED LOG === */}
      <div className="widget-card cancelled-section">
        <div className="cancelled-header">
          <div className="cancelled-title">
            <span className="cancelled-icon">🚫</span>
            <h3>Riwayat Pembatalan</h3>
          </div>
          <span className="badge badge-count">
            Total: {cancelledOrders.length}
          </span>
        </div>
        {cancelledOrders.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: "32px" }}>✅</div>
            <p>Aman</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Order</th>
                  <th>Pelanggan</th>
                  <th>Alasan</th>
                  <th>Dana</th>
                  <th>Nilai</th>
                </tr>
              </thead>
              <tbody>
                {cancelledOrders.map((order) => {
                  // ✅ FIX: Baca dari camelCase (jika sudah dimapping) ATAU snake_case (raw dari DB)
                  const rawAction =
                    order.financialAction || order.financial_action || "NONE";

                  return (
                    <tr key={order.id}>
                      <td className="text-muted">
                        {new Date(
                          order.cancelledAt || order.createdAt,
                        ).toLocaleString("id-ID")}
                      </td>
                      <td className="text-bold">{order.orderNumber}</td>
                      <td>{order.customerName}</td>
                      <td>
                        <span className="reason-badge">
                          {order.cancelReason}
                        </span>
                      </td>
                      <td>
                        {rawAction === "REFUND"
                          ? "💸 KEMBALI"
                          : rawAction === "FORFEIT"
                            ? "🔥 HANGUS"
                            : "-"}
                      </td>
                      <td className="text-right text-danger">
                        {formatRupiah(order.totalAmount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODALS */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
      {isActionPanelOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 9999,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
          onClick={() => setIsActionPanelOpen(false)}
        >
          <div
            style={{
              maxWidth: "800px",
              width: "90%",
              maxHeight: "80vh",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <OwnerActionPanel
              actions={actions}
              title="🎯 Rekomendasi Tindakan Cerdas"
            />
          </div>
        </div>
      )}
    </div>
  );
}
