/**
 * OwnerDashboard Component
 * READ-ONLY FINANCIAL DASHBOARD
 * CONNECTED TO INTELLIGENT STORE LOGIC (Anti-Zero & Service Detection)
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
import { HistoryModal } from "../pos/HistoryModal"; // Import History Modal

export function OwnerDashboard() {
  const navigate = useNavigate();
  const { isOwner } = usePermissions();
  const [period, setPeriod] = useState("today");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false); // History Modal State

  // AMBIL DATA DARI STORE (YANG SUDAH PINTAR)
  const {
    orders,
    loadOrders,
    summaryData, // <--- INI KUNCINYA (Data yang sudah diolah Store)
    loadSummary, // <--- Pemicu hitung ulang
    loading,
  } = useOrderStore();

  const { employees, loadEmployees, getActiveEmployees } = useEmployeeStore();
  const { todayAttendances, loadTodayAttendances } = useAttendanceStore();
  const { expenses, loadExpenses } = useExpenseStore();

  // === 1. LOAD DATA SAAT PERIOD BERUBAH ===
  useEffect(() => {
    const { start, end } = getDateRange(period);

    // Load Orders (untuk list recent & top products)
    loadOrders({ page: 1, limit: 50 });

    // Load Summary (untuk Financial Cards - Logika Anti-Nol ada di sini)
    loadSummary({ start, end });

    loadEmployees();
    loadTodayAttendances();
    loadExpenses();
  }, [
    period,
    loadOrders,
    loadSummary,
    loadEmployees,
    loadTodayAttendances,
    loadExpenses,
  ]);

  // === 2. HITUNG PENGELUARAN (EXPENSES) SECARA LOKAL ===
  // (Karena Expense Store terpisah, kita hitung manual di sini untuk Net Profit)
  const expenseStats = useMemo(() => {
    const { start, end } = getDateRange(period);

    const filteredExpenses = expenses.filter((e) => {
      const date = new Date(e.date);
      return date >= start && date <= end;
    });

    const totalExpenses = filteredExpenses.reduce(
      (sum, e) => sum + (e.amount || 0),
      0,
    );
    return totalExpenses;
  }, [expenses, period]);

  // === 3. SAFE DATA MAPPING (HANDLE NULL/UNDEFINED) ===
  // Mapping variabel untuk kompatibilitas dengan JSX yang sudah ada
  const safeData = summaryData || {};

  // Mapping sesuai permintaan: totalSales ← totalRevenue (prioritas) atau totalSales (existing)
  const totalSales = safeData.totalRevenue || safeData.totalSales || 0;

  // Mapping: totalTransactions ← totalCount
  const totalTransactions = safeData.totalCount || 0;

  // Mapping data lainnya dengan fallback aman
  const totalCollected = safeData.totalCollected || 0;
  const totalOutstanding = safeData.totalOutstanding || 0;
  const totalDiscount = safeData.totalDiscount || 0;
  const omsetBahan = safeData.omsetBahan || 0;
  const omsetJasa = safeData.omsetJasa || 0;

  // === 4. HITUNG NET PROFIT ===
  // Revenue (dari Store yang sudah fix) - Expense (dari perhitungan lokal)
  const netProfit = totalSales - expenseStats;

  // === 5. HITUNG SPLIT PIUTANG (TEMPO vs BAD DEBT) ===
  // Kita gunakan orders lokal untuk rasio, tapi totalnya tetap mengacu pada summaryData
  const receivableStats = useMemo(() => {
    let tempo = 0;
    let badDebt = 0;

    // Kita loop orders yang ada di memori untuk cek status tempo
    // Catatan: Ini estimasi dari 50 order terakhir yang terload.
    // Untuk akurasi 100% idealnya ini juga dari server, tapi untuk sekarang cukup.
    orders.forEach((o) => {
      if (o.remainingAmount > 0) {
        if (o.isTempo) tempo += o.remainingAmount;
        else badDebt += o.remainingAmount;
      }
    });

    return { tempo, badDebt };
  }, [orders]);

  if (!isOwner) {
    return (
      <div className="access-denied">
        <h2>❌ Akses Ditolak</h2>
        <p>Hanya Owner yang bisa mengakses dashboard ini.</p>
      </div>
    );
  }

  // Data untuk Widget
  const activeOrders = orders
    .filter((o) => o.productionStatus !== "CANCELLED")
    .slice(0, 50);
  const cancelledOrders = orders
    .filter((o) => o.productionStatus === "CANCELLED")
    .slice(0, 20);

  const hasEmployees = employees.length > 0;

  const handleExpenseClick = () => {
    navigate("/expenses");
  };

  return (
    <div className="owner-dashboard">
      {/* BURNING CORE HEADER - Command Center Style */}
      <div className="command-center-header">
        <div className="animated-border" />

        {/* LEFT: Identity */}
        <div
          className="header-identity"
          style={{ display: "flex", gap: "12px", alignItems: "center" }}
        >
          <span className="header-icon">📈</span>
          <div>
            <h1 className="header-title">Dashboard Owner</h1>
          </div>

          {/* History Button - Added beside title */}
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
              boxShadow: "0 0 15px rgba(139, 92, 246, 0.3)",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.05)";
              e.currentTarget.style.boxShadow =
                "0 0 20px rgba(139, 92, 246, 0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow =
                "0 0 15px rgba(139, 92, 246, 0.3)";
            }}
          >
            <span>📜</span>
            <span>Lihat Detail</span>
          </button>
        </div>

        {/* CENTER: Burning Net Profit (THE CORE) */}
        <div className="burning-core">
          <div className="core-label">NET PROFIT LIVE</div>
          <div className={`core-value ${netProfit >= 0 ? "profit" : "loss"}`}>
            {formatRupiah(netProfit)}
          </div>
          <div className="core-status">
            {netProfit >= 0 ? "🔥 Profit" : "❄️ Rugi"}
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

      {/* === TIER 1: FINANCIAL MACRO === */}
      <div className="stats-grid-5">
        <StatsCard
          icon="💰"
          title="Total Penjualan"
          value={formatRupiah(totalSales)} // Menggunakan mapped variable
          subtitle={`${totalTransactions} pesanan (Net)`} // Menggunakan mapped variable
          color="#22c55e"
        />
        <StatsCard
          icon="💵"
          title="Uang Terkumpul"
          value={formatRupiah(totalCollected)} // Menggunakan mapped variable
          subtitle={`Cash In Hand`}
          color="#3b82f6"
        />

        {/* Piutang Umum */}
        <StatsCard
          icon="⚠️"
          title="Kurang Bayar"
          value={formatRupiah(totalOutstanding)} // Menggunakan mapped variable
          subtitle="Harus ditagih"
          color="#ef4444"
        />

        {/* Invoice Berjalan (Placeholder / Future Dev) */}
        <StatsCard
          icon="⭐"
          title="Invoice Berjalan"
          value={formatRupiah(receivableStats.tempo)}
          subtitle="Piutang VIP / Korporat"
          color="#eab308"
        />

        {/* Total Discount */}
        <StatsCard
          icon="🎟️"
          title="Total Diskon"
          value={formatRupiah(totalDiscount)} // Menggunakan mapped variable
          subtitle="Potongan harga"
          color="#f59e0b"
        />

        {/* Expense Card */}
        <StatsCard
          icon="💸"
          title="Total Pengeluaran"
          value={formatRupiah(expenseStats)}
          subtitle="Klik untuk detail →"
          color="#f43f5e"
          isClickable={true}
          onClick={handleExpenseClick}
        />
      </div>

      {/* === TIER 2: REVENUE BREAKDOWN (OMSET BAHAN VS JASA) === */}
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
                Omset Bahan (Gross)
              </div>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "800",
                  color: "#22d3ee",
                  textShadow: "0 0 10px rgba(34, 211, 238, 0.5)",
                }}
              >
                {formatRupiah(omsetBahan)} {/* Menggunakan mapped variable */}
              </div>
              <div style={{ fontSize: "10px", color: "#94a3b8" }}>
                *Sebelum Diskon
              </div>
            </div>
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
                {formatRupiah(omsetJasa)} {/* Menggunakan mapped variable */}
              </div>
              <div style={{ fontSize: "10px", color: "#94a3b8" }}>
                Belum ada data
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* === TIER 3: OPERATIONAL STATS === */}
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

      {/* MONEY-ORIENTED SECONDARY STATS */}
      <div className="secondary-stats-grid">
        <div className="stat-card stat-card-danger">
          <div className="stat-card-label">🔴 Belum Bayar</div>
          <div className="stat-card-value">
            {summaryData.countByPaymentStatus?.UNPAID || 0}
          </div>
          <div className="stat-card-money">
            {formatRupiah(summaryData.totalOutstanding)}
          </div>
        </div>

        <div className="stat-card stat-card-warning">
          <div className="stat-card-label">🟡 DP (Cicilan)</div>
          <div className="stat-card-value">
            {summaryData.countByPaymentStatus?.DP || 0}
          </div>
          <div className="stat-card-money">Sisa: Rp 0</div>
        </div>

        <div className="stat-card stat-card-success">
          <div className="stat-card-label">🟢 Lunas</div>
          <div className="stat-card-value">
            {summaryData.countByPaymentStatus?.PAID || 0}
          </div>
          <div className="stat-card-money">
            {formatRupiah(summaryData.totalCollected)}
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="dashboard-widgets">
        <div className="widget-card">
          <h2 className="widget-title">📋 Pesanan Terbaru</h2>
          <RecentOrders orders={activeOrders.slice(0, 5)} />
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
                {cancelledOrders.map((order) => {
                  let financialStatus;
                  if (order.financialAction === "REFUND") {
                    financialStatus = (
                      <span className="badge badge-refund">
                        💸 DIKEMBALIKAN
                      </span>
                    );
                  } else if (order.financialAction === "FORFEIT") {
                    financialStatus = (
                      <span className="badge badge-forfeit">💰 MASUK KAS</span>
                    );
                  } else {
                    financialStatus = "-";
                  }

                  return (
                    <tr key={order.id}>
                      <td className="text-muted">
                        {new Date(
                          order.cancelledAt || order.createdAt,
                        ).toLocaleString("id-ID")}
                      </td>
                      <td className="text-bold">
                        {order.orderNumber ||
                          `#${String(order.id).slice(0, 8)}`}
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
                      <td className="text-center">{financialStatus}</td>
                      <td
                        className={`text-right ${order.totalAmount > 0 ? "text-danger text-bold" : ""}`}
                      >
                        {formatRupiah(order.totalAmount || 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* History Modal */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
    </div>
  );
}
