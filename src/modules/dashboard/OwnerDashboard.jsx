/**
 * OwnerDashboard Component
 * READ-ONLY FINANCIAL DASHBOARD - No input forms here
 * Expense input is on /expenses page
 */

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOrderStore } from "../../stores/useOrderStore";
import { useEmployeeStore } from "../../stores/useEmployeeStore";
import { useAttendanceStore } from "../../stores/useAttendanceStore";
import { useExpenseStore } from "../../stores/useExpenseStore";
import { usePermissions } from "../../hooks/usePermissions";
import { supabase } from "../../services/supabaseClient";
import { formatRupiah } from "../../core/formatters";
import { getDateRange } from "../../utils/dateHelpers";
import { StatsCard } from "./StatsCard";
import { RecentOrders } from "./RecentOrders";
import { TodayAttendance } from "./TodayAttendance";
import { TopProducts } from "./TopProducts";

export function OwnerDashboard() {
  const navigate = useNavigate();
  const { isOwner } = usePermissions();
  const [period, setPeriod] = useState("today");

  const { orders, loadOrders } = useOrderStore();
  const { employees, loadEmployees, getActiveEmployees } = useEmployeeStore();
  const { todayAttendances, loadTodayAttendances } = useAttendanceStore();
  const { expenses, loadExpenses, getTotalExpenses } = useExpenseStore();

  useEffect(() => {
    loadOrders();
    loadEmployees();
    loadTodayAttendances();
    loadExpenses();
  }, [loadOrders, loadEmployees, loadTodayAttendances, loadExpenses]);

  if (!isOwner) {
    return (
      <div className="access-denied">
        <h2>❌ Akses Ditolak</h2>
        <p>Hanya Owner yang bisa mengakses dashboard ini.</p>
      </div>
    );
  }

  // === REFACTORED: SERVER-SIDE STATS CALCULATION (RPC) ===
  const [stats, setStats] = useState({
    totalSales: 0,
    totalDiscount: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    netProfit: 0,
    totalOrders: 0,
    unpaidCount: 0,
    paidCount: 0,
    dpCount: 0,
    pendingOrders: 0,
    inProgressOrders: 0,
    readyOrders: 0,
    deliveredOrders: 0,
    totalLostRevenue: 0,
    totalRevenuePrint: 0, // Not yet in RPC, placeholder
    totalRevenueFinish: 0, // Not yet in RPC, placeholder
  });

  // Fetch stats from Supabase RPC
  const fetchStats = async () => {
    try {
      const { start, end } = getDateRange(period);

      // 1. Call RPC for Financials
      const { data: rpcData, error } = await supabase.rpc(
        "get_dashboard_summary",
        {
          start_date: start.toISOString(),
          end_date: end.toISOString(),
        },
      );

      if (error) throw error;

      // 2. Fetch Operational Counts (Lightweight Count Queries)
      // We can optimize this later with another RPC if needed
      const { count: pending } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("production_status", "PENDING");
      const { count: inProgress } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("production_status", "IN_PROGRESS");
      const { count: ready } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("production_status", "READY");

      // Note: For now, we mix RPC data with some placeholders because the RPC
      // defined in the prompt only covers financial totals.
      // Ideally we'd expand the RPC to return all these counts.

      setStats((prev) => ({
        ...prev,
        ...rpcData, // totalSales, totalDiscount, netProfit, etc.
        pendingOrders: pending || 0,
        inProgressOrders: inProgress || 0,
        readyOrders: ready || 0,
        // approximate others or fetch if critical
      }));
    } catch (err) {
      console.error("Failed to fetch dashboard stats via RPC:", err);
      // Fallback to local store if offline?
      // For now, we assume this dashboard is 'Online Mode' optimized as requested.
    }
  };

  useEffect(() => {
    fetchStats();
  }, [period]);

  // Keep legacy local data for specific lists (Recent Orders) if needed,
  // but avoid heavy calculations.
  const activeOrders = orders
    .filter((o) => o.productionStatus !== "CANCELLED")
    .slice(0, 50); // Limit needed
  const cancelledOrders = orders
    .filter((o) => o.productionStatus === "CANCELLED")
    .slice(0, 20);

  // Fix ReferenceErrors by mapping to available stats or safe defaults
  const filteredOrders = activeOrders; // Safe fallback for UI requiring a list
  const unpaidTotal = stats.totalOutstanding; // Use total outstanding for the "Belum Bayar" general indicator
  const dpRemainingTotal = 0; // Not available in simple RPC, set to 0 to avoid crash
  const paidTotal = stats.totalCollected; // Use total collected for "Lunas" indicator (approximate)

  const recentOrders = [...activeOrders]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const hasEmployees = stats.totalEmployees > 0;

  // Navigate to expenses page (READ-ONLY dashboard - no modal)
  const handleExpenseClick = () => {
    navigate("/expenses");
  };

  return (
    <div className="owner-dashboard">
      {/* BURNING CORE HEADER - Command Center Style */}
      <div className="command-center-header">
        {/* Animated gradient border */}
        <div className="animated-border" />

        {/* LEFT: Identity */}
        <div className="header-identity">
          <span className="header-icon">📈</span>
          <div>
            <h1 className="header-title">Dashboard Owner</h1>
          </div>
        </div>

        {/* CENTER: Burning Net Profit (THE CORE) */}
        <div className="burning-core">
          <div className="core-label">NET PROFIT LIVE</div>
          <div
            className={`core-value ${stats.netProfit >= 0 ? "profit" : "loss"}`}
          >
            {formatRupiah(stats.netProfit)}
          </div>
          <div className="core-status">
            {stats.netProfit >= 0 ? "🔥 Profit" : "❄️ Rugi"}
          </div>
        </div>

        {/* RIGHT: Capsule Filter */}
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

      {/* === TIER 1: FINANCIAL MACRO (4 CARDS) === */}
      <div className="stats-grid-5">
        <StatsCard
          icon="💰"
          title="Total Penjualan"
          value={formatRupiah(stats.totalSales)}
          subtitle={`${stats.totalOrders} pesanan (Net)`}
          color="#22c55e"
        />
        <StatsCard
          icon="💵"
          title="Uang Terkumpul"
          value={formatRupiah(stats.totalCollected)}
          subtitle={`Piutang: ${formatRupiah(stats.totalOutstanding)}`}
          color="#3b82f6"
        />

        {/* NEW: Total Discount Card */}
        <StatsCard
          icon="🎟️"
          title="Total Diskon"
          value={formatRupiah(stats.totalDiscount)}
          subtitle={`${filteredOrders.filter((o) => (o.discount || 0) > 0).length} order dapat diskon`}
          color="#f59e0b"
        />

        {/* EXPENSE CARD - Shortcut to /expenses page */}
        <StatsCard
          icon="💸"
          title="Total Pengeluaran"
          value={formatRupiah(stats.totalExpenses)}
          subtitle="Klik untuk detail →"
          color="#f43f5e"
          isClickable={true}
          onClick={handleExpenseClick}
        />
      </div>

      {/* === TIER 2: REVENUE BREAKDOWN (2 WIDE CARDS - NEON ACCENTS) === */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "16px",
          marginTop: "16px",
        }}
      >
        {/* Print Revenue Card - Cyan Neon */}
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)",
            borderRadius: "16px",
            padding: "20px",
            border: "1px solid rgba(6, 182, 212, 0.3)",
            borderLeft: "4px solid #06b6d4",
            boxShadow: "0 0 20px rgba(6, 182, 212, 0.15)",
            transition: "all 0.3s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "12px",
            }}
          >
            <span style={{ fontSize: "32px" }}>🖨️</span>
            <div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "700",
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Omset Bahan (Print)
              </div>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "900",
                  color: "#06b6d4",
                  marginTop: "4px",
                }}
              >
                {formatRupiah(stats.totalRevenuePrint)}
              </div>
            </div>
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "#94a3b8",
              paddingTop: "8px",
              borderTop: "1px solid rgba(100, 116, 139, 0.2)",
            }}
          >
            {stats.totalSales > 0
              ? `${Math.round((stats.totalRevenuePrint / stats.totalSales) * 100)}% dari total omset`
              : "Belum ada data"}
          </div>
        </div>

        {/* Finishing Revenue Card - Purple Neon */}
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)",
            borderRadius: "16px",
            padding: "20px",
            border: "1px solid rgba(139, 92, 246, 0.3)",
            borderLeft: "4px solid #8b5cf6",
            boxShadow: "0 0 20px rgba(139, 92, 246, 0.15)",
            transition: "all 0.3s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "12px",
            }}
          >
            <span style={{ fontSize: "32px" }}>✨</span>
            <div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "700",
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Omset Jasa (Finishing)
              </div>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "900",
                  color: "#8b5cf6",
                  marginTop: "4px",
                }}
              >
                {formatRupiah(stats.totalRevenueFinish)}
              </div>
            </div>
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "#94a3b8",
              paddingTop: "8px",
              borderTop: "1px solid rgba(100, 116, 139, 0.2)",
            }}
          >
            {stats.totalSales > 0
              ? `${Math.round((stats.totalRevenueFinish / stats.totalSales) * 100)}% dari total omset`
              : "Belum ada data"}
          </div>
        </div>
      </div>

      {/* === TIER 3: OPERATIONAL STATS (2 CARDS) === */}
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
          value={stats.pendingOrders}
          subtitle={`Dikerjakan: ${stats.inProgressOrders}`}
          color="#f59e0b"
        />
        <StatsCard
          icon="✅"
          title="Siap Diambil"
          value={stats.readyOrders}
          subtitle={`Terkirim: ${stats.deliveredOrders}`}
          color="#8b5cf6"
        />
      </div>

      {/* MONEY-ORIENTED SECONDARY STATS */}
      <div className="secondary-stats-grid">
        <div className="stat-card stat-card-danger">
          <div className="stat-card-label">🔴 Belum Bayar</div>
          <div className="stat-card-value">{stats.unpaidCount}</div>
          <div className="stat-card-money">{formatRupiah(unpaidTotal)}</div>
        </div>

        <div className="stat-card stat-card-warning">
          <div className="stat-card-label">🟡 DP (Cicilan)</div>
          <div className="stat-card-value">{stats.dpCount}</div>
          <div className="stat-card-money">
            Sisa: {formatRupiah(dpRemainingTotal)}
          </div>
        </div>

        <div className="stat-card stat-card-success">
          <div className="stat-card-label">🟢 Lunas</div>
          <div className="stat-card-value">{stats.paidCount}</div>
          <div className="stat-card-money">{formatRupiah(paidTotal)}</div>
        </div>

        {hasEmployees && (
          <>
            <div className="stat-card stat-card-purple">
              <div className="stat-card-label">👥 Karyawan Aktif</div>
              <div className="stat-card-value">{stats.totalEmployees}</div>
            </div>
            <div className="stat-card stat-card-cyan">
              <div className="stat-card-label">✅ Hadir Hari Ini</div>
              <div className="stat-card-value">
                {stats.presentToday}/{stats.totalEmployees}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Content Grid */}
      <div className="dashboard-widgets">
        <div className="widget-card">
          <h2 className="widget-title">📋 Pesanan Terbaru</h2>
          <RecentOrders orders={recentOrders} />
        </div>

        <div className="widget-card">
          <h2 className="widget-title">🏆 Produk Terlaris</h2>
          <TopProducts orders={activeOrders} />
        </div>

        {hasEmployees && (
          <div className="widget-card">
            <h2 className="widget-title">⏰ Absensi Hari Ini</h2>
            <TodayAttendance
              attendances={todayAttendances}
              employees={getActiveEmployees()}
            />
          </div>
        )}
      </div>

      {/* Cancelled Orders Log */}
      <div className="widget-card cancelled-section">
        <div className="cancelled-header">
          <div className="cancelled-title">
            <span className="cancelled-icon">🚫</span>
            <div>
              <h3>Riwayat Pembatalan</h3>
              <p>Monitoring order yang digagalkan</p>
            </div>
          </div>
          <div className="cancelled-badges">
            <span className="badge badge-count">
              Total: {cancelledOrders.length}
            </span>
            <span className="badge badge-lost">
              Lost: {formatRupiah(stats.totalLostRevenue)}
            </span>
          </div>
        </div>

        {cancelledOrders.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>✅</div>
            <p>Belum ada data pembatalan (Aman)</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Waktu Batal</th>
                  <th>ID Order</th>
                  <th>Pelanggan</th>
                  <th>Alasan</th>
                  <th>Nasib Uang</th>
                  <th>Nominal</th>
                </tr>
              </thead>
              <tbody>
                {cancelledOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="text-muted">
                      {new Date(
                        order.cancelledAt || order.createdAt,
                      ).toLocaleString("id-ID")}
                    </td>
                    <td className="text-bold">
                      {order.orderNumber || `#${String(order.id).slice(0, 8)}`}
                    </td>
                    <td>
                      {order.customerSnapshot?.name ||
                        order.customerName ||
                        "-"}
                    </td>
                    <td>
                      <span className="reason-badge">
                        "{order.cancelReason || "Tidak ada alasan"}"
                      </span>
                    </td>
                    <td className="text-center">
                      {order.financialAction === "REFUND" ? (
                        <span className="badge badge-refund">
                          💸 DIKEMBALIKAN
                        </span>
                      ) : order.financialAction === "FORFEIT" ? (
                        <span className="badge badge-forfeit">
                          💰 MASUK KAS
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td
                      className={`text-right ${order.totalAmount > 0 ? "text-danger text-bold" : ""}`}
                    >
                      {formatRupiah(order.totalAmount || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
