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
import { formatRupiah } from "../../core/formatters";
import { formatDate, formatTime, getDateRange } from "../../utils/dateHelpers";
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

  const dateRange = getDateRange(period);
  const cancelledOrders = orders
    .filter((o) => o.productionStatus === "CANCELLED")
    .sort(
      (a, b) =>
        new Date(b.cancelledAt || b.createdAt) -
        new Date(a.cancelledAt || a.createdAt),
    );

  const activeOrders = orders.filter((o) => o.productionStatus !== "CANCELLED");
  const filteredOrders = activeOrders.filter((order) => {
    const orderDate = new Date(order.createdAt);
    return orderDate >= dateRange.start && orderDate <= dateRange.end;
  });

  const unpaidOrders = filteredOrders.filter(
    (o) => o.paymentStatus === "UNPAID",
  );
  const unpaidTotal = unpaidOrders.reduce(
    (sum, o) => sum + (o.totalAmount || 0),
    0,
  );
  const dpOrders = filteredOrders.filter((o) => o.paymentStatus === "DP");
  const dpRemainingTotal = dpOrders.reduce(
    (sum, o) => sum + (o.remainingAmount || 0),
    0,
  );
  const paidOrders = filteredOrders.filter((o) => o.paymentStatus === "PAID");
  const paidTotal = paidOrders.reduce(
    (sum, o) => sum + (o.totalAmount || 0),
    0,
  );

  // Calculate expenses for the period
  const totalExpenses = getTotalExpenses(dateRange.start, dateRange.end);

  // ADVANCED REVENUE SPLIT CALCULATION
  // Includes: ADVANCED metadata + SERVICE fees (Express/Urgent priority)
  const revenueBreakdown = filteredOrders.reduce(
    (acc, order) => {
      if (!order.items || !Array.isArray(order.items)) return acc;

      order.items.forEach((item) => {
        // === SERVICE FEES: Express (+15k) / Urgent (+30k) ===
        // These are pure profit items with pricingType: "SERVICE"
        if (item.pricingType === "SERVICE") {
          acc.revenueFinish += item.totalPrice || 0;
          return; // Don't double-count
        }

        // === ADVANCED PRODUCTS: Use split revenue metadata ===
        if (
          item.meta?.revenue_print !== undefined ||
          item.meta?.revenue_finish !== undefined
        ) {
          acc.revenuePrint += item.meta.revenue_print || 0;
          acc.revenueFinish += item.meta.revenue_finish || 0;
        } else {
          // Legacy product - assume 100% is print revenue
          acc.revenuePrint += item.totalPrice || 0;
        }
      });

      return acc;
    },
    { revenuePrint: 0, revenueFinish: 0 },
  );

  const stats = {
    // === FIX: Use finalAmount (after discount) for real revenue ===
    totalSales: filteredOrders.reduce((sum, order) => {
      // Check for order-level discount first
      const orderDiscount = order.discount || 0;
      const orderSubtotal =
        order.items?.reduce(
          (itemSum, item) => itemSum + (item.totalPrice || 0),
          0,
        ) || 0;
      // finalAmount = subtotal - discount
      const orderFinalAmount =
        order.grandTotal || order.finalAmount || orderSubtotal - orderDiscount;
      return sum + orderFinalAmount;
    }, 0),
    // === NEW: Total discount given ===
    totalDiscount: filteredOrders.reduce((sum, order) => {
      return sum + (order.discount || 0);
    }, 0),
    totalRevenuePrint: revenueBreakdown.revenuePrint,
    totalRevenueFinish: revenueBreakdown.revenueFinish,
    totalOrders: filteredOrders.length,
    unpaidCount: unpaidOrders.length,
    dpCount: dpOrders.length,
    paidCount: paidOrders.length,
    pendingOrders: filteredOrders.filter(
      (o) => o.productionStatus === "PENDING",
    ).length,
    inProgressOrders: filteredOrders.filter(
      (o) => o.productionStatus === "IN_PROGRESS",
    ).length,
    readyOrders: filteredOrders.filter((o) => o.productionStatus === "READY")
      .length,
    deliveredOrders: filteredOrders.filter(
      (o) => o.productionStatus === "DELIVERED",
    ).length,
    cancelledOrders: cancelledOrders.length,
    totalCollected: filteredOrders.reduce(
      (sum, order) => sum + order.paidAmount,
      0,
    ),
    // === FIX: Unpaid/Outstanding uses remaining_amount for TEMPO orders ===
    totalOutstanding: filteredOrders.reduce((sum, order) => {
      // Only count remaining for orders that are not fully paid
      if (order.paymentStatus === "UNPAID" || order.paymentStatus === "DP") {
        return sum + (order.remainingAmount || 0);
      }
      return sum;
    }, 0),
    totalLostRevenue: cancelledOrders.reduce(
      (sum, order) => sum + (order.totalAmount || 0),
      0,
    ),
    totalEmployees: getActiveEmployees().length,
    presentToday: todayAttendances.filter((a) => a.checkInTime).length,
    totalExpenses: totalExpenses,
    // === FIX: Net profit uses real revenue (after discount) ===
    netProfit:
      filteredOrders.reduce((sum, order) => {
        const orderDiscount = order.discount || 0;
        const orderSubtotal =
          order.items?.reduce(
            (itemSum, item) => itemSum + (item.totalPrice || 0),
            0,
          ) || 0;
        const orderFinalAmount =
          order.grandTotal ||
          order.finalAmount ||
          orderSubtotal - orderDiscount;
        return sum + orderFinalAmount;
      }, 0) - totalExpenses,
  };

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
