import React, { useEffect, useState, useMemo } from "react";
import {
  useExpenseStore,
  EXPENSE_CATEGORIES,
} from "../../stores/useExpenseStore";
import { useEmployeeStore } from "../../stores/useEmployeeStore";
import { usePermissions } from "../../hooks/usePermissions";
import { formatRupiah } from "../../core/formatters";
import { getDateRange } from "../../utils/dateHelpers";
import ExpenseInputForm from "../../components/expenses/ExpenseInputForm";
import OperationalTab from "../../components/expenses/OperationalTab";
import HrMonitorTab from "../../components/expenses/HrMonitorTab";
import MatrixDetailModal from "../../components/expenses/MatrixDetailModal";

// 🧠 OPERATIONAL MATRIX LOGIC (SMART CATEGORIES)
const getSmartAuditCategory = (desc) => {
  const text = desc ? desc.toLowerCase() : "";
  if (
    text.match(
      /makan|minum|snack|kopi|galon|aqua|\bteh\b|gula|beras|lauk|soto|bakso|gorengan|\bes\b|nasi|konsumsi|roti/,
    )
  )
    return { key: "KONSUMSI", label: "🍛 KONSUMSI" };
  if (
    text.match(
      /bensin|pertalite|pertamax|solar|parkir|tol|gojek|grab|ongkir|antar|kurir|transport|bbm/,
    )
  )
    return { key: "TRANSPORT", label: "⛽ TRANSPORT" };
  if (
    text.match(
      /listrik|\bair\b|wifi|internet|pulsa|token|kuota|pln|pdam|indihome|telkom/,
    )
  )
    return { key: "UTILITAS", label: "⚡ UTILITAS" };
  if (
    text.match(
      /kertas|tinta|lakban|nota|pulpen|spidol|map|amplop|fotocopy|jilid|staples|isolasi|gunting|lem|plastik|kresek/,
    )
  )
    return { key: "ATK_BAHAN", label: "📎 ATK & BAHAN" };
  return { key: "LAIN_LAIN", label: "📦 LAIN-LAIN" };
};

export function ExpensePage() {
  const {
    expenses,
    loadExpenses,
    deleteExpense,
    subscribeToExpenses,
    unsubscribeFromExpenses,
    syncFromCloud,
    hrMatrixData, // NEW: Server-Side HR Matrix
    isHrMatrixLoading, // NEW: Server-Side HR Matrix Loading State
    fetchHrMatrixSummary, // NEW: Server-Side HR Matrix Fetcher

    opMatrixData, // NEW: Server-Side Operational Matrix
    isOpMatrixLoading, // NEW: Server-Side Operational Matrix Loading State
    fetchOpMatrixSummary, // NEW: Server-Side Op Matrix Fetcher

    matrixDetailData, // NEW: detail pop-up data
    isMatrixDetailLoading, // NEW: detail pop-up state
    fetchMatrixCellDetails, // NEW: detail pop-up action
  } = useExpenseStore();
  const { loadEmployees, syncFromCloud: syncEmployeesFromCloud } =
    useEmployeeStore();

  const { isOwner } = usePermissions(); // DETEKTOR PERAN (Owner vs Karyawan)

  // Permission-aware view: Only OWNER sees history/totals
  const canViewHistory = isOwner;

  // 🔒 BLIND ENTRY MODE LOGIC
  useEffect(() => {
    // Only fetch history if OWNER
    if (isOwner) {
      loadExpenses();
    }
    // Always load employees for dropdown and trigger cloud sync for safety
    loadEmployees();
    syncEmployeesFromCloud();

    // 📡 REALTIME SUBSCRIPTION
    subscribeToExpenses();
    return () => unsubscribeFromExpenses();
  }, [
    loadExpenses,
    loadEmployees,
    isOwner,
    subscribeToExpenses,
    unsubscribeFromExpenses,
  ]);

  const [showModal, setShowModal] = useState(false);
  const [period, setPeriod] = useState("month");
  const [activeTab, setActiveTab] = useState("operational");

  // Load Attendance when HR Monitor tab is active
  // CTO-FIX: Memoize dateRange to prevent infinite loop
  const dateRange = useMemo(() => getDateRange(period), [period]);

  // HR MONITOR SPECIFIC STATE
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // 📊 OPERATIONAL HYBRID VIEW STATE
  const [operationalViewMode, setOperationalViewMode] = useState("DAILY"); // DAILY | WEEKLY
  // Note: isOperationalMatrixLoaded is now handled by isOpMatrixLoading from store

  // 📡 SERVER-SIDE HR & OP MATRIX MATCHER
  useEffect(() => {
    if (isOwner) {
      if (activeTab === "hr_monitor") {
        console.log(
          "📡 Fetching Server-Side HR Matrix for:",
          selectedMonth,
          selectedYear,
        );
        fetchHrMatrixSummary(selectedMonth, selectedYear);
      }
    }
  }, [activeTab, selectedMonth, selectedYear, isOwner, fetchHrMatrixSummary]);

  useEffect(() => {
    if (isOwner) {
      // For operational tab, we only fetch if they are in WEEKLY mode
      if (activeTab === "operational" && operationalViewMode === "WEEKLY") {
        console.log(
          "📡 Fetching Server-Side OP Matrix for:",
          selectedMonth,
          selectedYear,
        );
        fetchOpMatrixSummary(selectedMonth, selectedYear);
      }
    }
  }, [
    activeTab,
    operationalViewMode,
    selectedMonth,
    selectedYear,
    isOwner,
    fetchOpMatrixSummary,
  ]);

  // Reset lazy load state when period changes (so we fetch new data)
  useEffect(() => {
    // ☁️ FORCE SYNC FROM CLOUD ON PERIOD CHANGE
    // Ensures Localhost pulls latest data (e.g., from Vercel) instead of relying solely on offline Dexie cache
    if (isOwner) {
      console.log(
        "☁️ Period Changed:",
        period,
        "- Force syncing expenses from cloud",
      );
      syncFromCloud();
    }
  }, [period, isOwner, syncFromCloud]);

  // Filter expenses by period
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const expDate = new Date(exp.date);
      return expDate >= dateRange.start && expDate <= dateRange.end;
    });
  }, [expenses, dateRange]);

  const operationalExpenses = useMemo(
    () =>
      filteredExpenses.filter(
        (exp) => exp.category !== "SALARY" && exp.category !== "BON",
      ),
    [filteredExpenses],
  );

  const payrollExpenses = useMemo(
    () =>
      filteredExpenses.filter(
        (exp) => exp.category === "SALARY" || exp.category === "BON",
      ),
    [filteredExpenses],
  );

  // 📊 OPERATIONAL HYBRID VIEW STATE
  // 🧠 OPERATIONAL MATRIX LOGIC -> MOVED TO SERVER-SIDE (SUPABASE RPC)
  // `opMatrixData` is now directly serving the JSON from get_operational_matrix_summary

  // 🧠 HR AGGREGATOR LOGIC -> MOVED TO SERVER-SIDE (SUPABASE RPC)
  // `hrMatrixData` is now directly serving the JSON from get_hr_matrix_summary

  const totalOperational = operationalExpenses.reduce(
    (sum, exp) => sum + exp.amount,
    0,
  );
  const totalPayroll = payrollExpenses.reduce(
    (sum, exp) => sum + exp.amount,
    0,
  );
  const grandTotal = totalOperational + totalPayroll;

  const handleDelete = async (id) => {
    if (window.confirm("Hapus pengeluaran ini?")) {
      await deleteExpense(id);
    }
  };

  const getCategoryLabel = (catId) => EXPENSE_CATEGORIES[catId]?.label || catId;
  const getCategoryColor = (catId) =>
    EXPENSE_CATEGORIES[catId]?.color || "#64748b";

  // 📊 DRILL DOWN STATE
  const [selectedDetail, setSelectedDetail] = useState(null); // { employeeId, name, week, start, end }

  // Helper to get start/end date of a specific week bucket
  const getWeekDateRange = (weekBucket) => {
    const startOfMonth = new Date(dateRange.start);
    const year = startOfMonth.getFullYear();
    const month = startOfMonth.getMonth();

    let startDay, endDay;

    if (weekBucket === 1) {
      startDay = 1;
      endDay = 7;
    } else if (weekBucket === 2) {
      startDay = 8;
      endDay = 14;
    } else if (weekBucket === 3) {
      startDay = 15;
      endDay = 21;
    } else {
      startDay = 22;
      // Get last day of month
      endDay = new Date(year, month + 1, 0).getDate();
    }

    const start = new Date(year, month, startDay);
    const end = new Date(year, month, endDay, 23, 59, 59);

    return { start, end };
  };

  const handleHrCellClick = (employeeId, employeeName, weekBucket) => {
    const range = getWeekDateRange(weekBucket);
    const detail = {
      type: "HR",
      id: employeeId,
      name: employeeName,
      week: weekBucket,
      start: range.start,
      end: range.end,
    };
    console.log("HR Cell Clicked! Setting selectedDetail:", detail);
    setSelectedDetail(detail);

    // Fire RPC Call (HR uses special category 'HR_ATTENDANCE' to differentiate logic in Postgres)
    fetchMatrixCellDetails(
      "HR_ATTENDANCE",
      selectedMonth,
      selectedYear,
      weekBucket,
      employeeId,
    );
  };

  const handleOperationalCellClick = (categoryId, categoryName, weekBucket) => {
    const range = getWeekDateRange(weekBucket);
    const detail = {
      type: "OPERATIONAL_WEEKLY",
      id: categoryId,
      name: categoryName,
      week: weekBucket,
      start: range.start,
      end: range.end, // Store exact boundary for UI display
    };
    console.log("Op Cell Clicked! Setting selectedDetail:", detail);
    setSelectedDetail(detail);

    // Fire RPC Call (Target specific category MATERIAL/OPERATIONAL/OTHER)
    // Send null for employeeId because this is just operational expenses
    fetchMatrixCellDetails(
      categoryId,
      selectedMonth,
      selectedYear,
      weekBucket,
      null,
    );
  };

  // 📡 Filter Data for Drill Down from Server RPC `matrixDetailData`
  const drillDownData = useMemo(() => {
    if (!selectedDetail || isMatrixDetailLoading)
      return { attendances: [], expenses: [], categorySummary: {} };

    const { type } = selectedDetail;

    // Safely extract from RPC's structured JSON `{ attendances: [], expenses: [] }`
    // Fallback safely if it transitively passed an old array structure
    const safeData = Array.isArray(matrixDetailData)
      ? {}
      : matrixDetailData || {};

    if (type === "HR") {
      return {
        attendances: safeData.attendances || [],
        expenses: safeData.expenses || [],
        categorySummary: {},
      };
    } else if (type === "OPERATIONAL_WEEKLY") {
      const exps = safeData.expenses || [];

      const categories = {
        KONSUMSI: 0,
        TRANSPORT: 0,
        UTILITAS: 0,
        ATK_BAHAN: 0,
        LAIN_LAIN: 0,
      };

      exps.forEach((e) => {
        const { key } = getSmartAuditCategory(e.description);
        if (categories[key] !== undefined) categories[key] += e.amount;
        else categories["LAIN_LAIN"] += e.amount;
      });

      return { attendances: [], expenses: exps, categorySummary: categories };
    }

    return { attendances: [], expenses: [], categorySummary: {} };
  }, [selectedDetail, isMatrixDetailLoading, matrixDetailData]);

  return (
    <div className="expense-page p-6 pb-24">
      {/* Header */}
      <div className="wallstreet-container mb-6">
        <div className="animated-border" />
        <div className="dashboard-header flex justify-between items-center bg-slate-800 p-6 rounded-2xl border border-slate-700">
          <div>
            <h1 className="wallstreet-title text-2xl font-bold text-white">
              💸 Pengeluaran
            </h1>
            <p className="subtitle text-slate-400">
              {isOwner
                ? "Catat dan monitor semua pengeluaran bisnis"
                : "Input Pengeluaran Operasional"}
            </p>
          </div>
          <div className="period-filter flex gap-2">
            {["today", "week", "month"].map((p) => (
              <button
                key={p}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${period === p ? "bg-blue-600 text-white shadow-lg" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}
                onClick={() => setPeriod(p)}
              >
                {p === "today"
                  ? "Hari Ini"
                  : p === "week"
                    ? "7 Hari"
                    : "Bulan Ini"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 🛡️ SECURITY: BLIND ENTRY MODE 🛡️ */}
      {canViewHistory ? (
        <>
          {/* 1. FINANCIAL SUMMARY (OWNER ONLY) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-lg flex items-center justify-between">
              <div>
                <div className="text-slate-400 text-xs uppercase font-bold">
                  Total Pengeluaran
                </div>
                <div className="text-2xl font-bold text-white mt-1">
                  {formatRupiah(grandTotal)}
                </div>
                <div className="text-xs text-slate-500 mt-1 flex gap-2">
                  <span className="text-emerald-400">
                    Ops: {formatRupiah(totalOperational)}
                  </span>
                  <span className="text-slate-600">|</span>
                  <span className="text-blue-400">
                    Gaji: {formatRupiah(totalPayroll)}
                  </span>
                </div>
              </div>
              <button
                className="bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-3 rounded-xl font-bold shadow-lg transition-transform active:scale-95 flex items-center gap-2"
                onClick={() => setShowModal(true)}
              >
                <span>➕</span> Catat
              </button>
            </div>
          </div>

          {/* 2. TABS & FILTER (OWNER ONLY) */}
          <div className="flex gap-4 mb-4 border-b border-slate-700 pb-1">
            <button
              className={`pb-2 px-4 text-sm font-bold border-b-2 transition-all ${activeTab === "operational" ? "border-emerald-500 text-emerald-400" : "border-transparent text-slate-500"}`}
              onClick={() => setActiveTab("operational")}
            >
              📦 OPERASIONAL ({operationalExpenses.length})
            </button>
            <button
              className={`pb-2 px-4 text-sm font-bold border-b-2 transition-all ${activeTab === "payroll" ? "border-blue-500 text-blue-400" : "border-transparent text-slate-500"}`}
              onClick={() => setActiveTab("payroll")}
            >
              🔒 PAYROLL & KASBON ({payrollExpenses.length})
            </button>
            <button
              className={`pb-2 px-4 text-sm font-bold border-b-2 transition-all ${activeTab === "hr_monitor" ? "border-purple-500 text-purple-400" : "border-transparent text-slate-500"}`}
              onClick={() => setActiveTab("hr_monitor")}
            >
              📡 MONITOR SDM
            </button>
          </div>

          {/* 3. CONTENT AREA */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            {/* 📦 OPERATIONAL TAB CONTENT (HYBRID) */}
            {activeTab === "operational" && (
              <OperationalTab
                operationalViewMode={operationalViewMode}
                setOperationalViewMode={setOperationalViewMode}
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
                isOpMatrixLoading={isOpMatrixLoading}
                opMatrixData={opMatrixData}
                handleOperationalCellClick={handleOperationalCellClick}
                operationalExpenses={operationalExpenses}
                handleDelete={handleDelete}
              />
            )}

            {/* PAYROLL LIST (Standard) */}
            {activeTab === "payroll" &&
              (payrollExpenses.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <div className="text-4xl mb-2">🔐</div>
                  <p>Belum ada data payroll.</p>
                </div>
              ) : (
                <table className="w-full text-left text-slate-300">
                  <thead className="bg-slate-900 text-xs font-bold uppercase text-slate-400">
                    <tr>
                      <th className="p-4">Tanggal</th>
                      <th className="p-4">Kategori</th>
                      <th className="p-4">Karyawan</th>
                      <th className="p-4">Nominal</th>
                      <th className="p-4">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {payrollExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-700/50">
                        <td className="p-4 text-sm text-slate-400">
                          {new Date(exp.date).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </td>
                        <td className="p-4">
                          <span
                            className="px-2 py-1 rounded text-xs font-bold"
                            style={{
                              color: getCategoryColor(exp.category),
                              backgroundColor: `${getCategoryColor(exp.category)}20`,
                              border: `1px solid ${getCategoryColor(exp.category)}40`,
                            }}
                          >
                            {getCategoryLabel(exp.category)}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-white">
                            {exp.description}
                          </div>
                          {exp.employeeName && (
                            <div className="text-xs text-blue-400 mt-1">
                              👤 {exp.employeeName}
                            </div>
                          )}
                        </td>
                        <td className="p-4 font-mono text-emerald-400 font-bold">
                          {formatRupiah(exp.amount)}
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => handleDelete(exp.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ))}

            {/* HR MONITOR SATELLITE VIEW (SERVER-SIDE) */}
            {activeTab === "hr_monitor" && (
              <HrMonitorTab
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
                isHrMatrixLoading={isHrMatrixLoading}
                hrMatrixData={hrMatrixData}
                handleHrCellClick={handleHrCellClick}
              />
            )}
          </div>
        </>
      ) : (
        /* 🔒 BLIND ENTRY VIEW (INPUT ONLY) */
        <div className="flex flex-col items-center justify-center py-20">
          <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl text-center max-w-lg w-full">
            <div className="text-6xl mb-6">🔒</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Mode Pencatatan Aman
            </h2>
            <p className="text-slate-400 mb-8">
              Data pengeluaran akan langsung disimpan ke server. Anda tidak
              dapat melihat riwayat pengeluaran.
            </p>
            <button
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-4 rounded-xl font-bold shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-3 text-lg"
              onClick={() => setShowModal(true)}
            >
              <span>➕</span> CATAT PENGELUARAN BARU
            </button>
          </div>
        </div>
      )}

      {/* MODAL CATAT PENGELUARAN */}
      {showModal && <ExpenseInputForm onClose={() => setShowModal(false)} />}

      {/* 🧾 DETAIL DRILL-DOWN MODAL */}
      {console.log("Current selectedDetail state:", selectedDetail)}
      {selectedDetail && (
        <MatrixDetailModal
          selectedDetail={selectedDetail}
          setSelectedDetail={setSelectedDetail}
          drillDownData={drillDownData}
          isMatrixDetailLoading={isMatrixDetailLoading}
        />
      )}
    </div>
  );
}

export default ExpensePage;
