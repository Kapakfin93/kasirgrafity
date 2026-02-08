import React, { useEffect, useState, useMemo } from "react";
import {
  useExpenseStore,
  EXPENSE_CATEGORIES,
} from "../../stores/useExpenseStore";
import { useEmployeeStore } from "../../stores/useEmployeeStore";
import { useAttendanceStore } from "../../stores/useAttendanceStore";
import { usePermissions } from "../../hooks/usePermissions";
import { formatRupiah } from "../../core/formatters";
import { getDateRange } from "../../utils/dateHelpers";

// Smart currency formatter
const formatCurrencyInput = (value) => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("id-ID").format(parseInt(digits, 10));
};

const parseCurrencyInput = (formattedValue) => {
  return parseInt(formattedValue.replace(/\D/g, ""), 10) || 0;
};

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
    addExpense,
    deleteExpense,
    subscribeToExpenses,
    unsubscribeFromExpenses,
  } = useExpenseStore();
  const { loadEmployees, getActiveEmployees } = useEmployeeStore();
  const { attendances, loadAttendancesByDateRange } = useAttendanceStore(); // AGILE: Add Attendance Store

  const { isOwner } = usePermissions(); // DETEKTOR PERAN (Owner vs Karyawan)

  // Permission-aware view: Only OWNER sees history/totals
  const canViewHistory = isOwner;

  // 🔒 BLIND ENTRY MODE LOGIC
  useEffect(() => {
    // Only fetch history if OWNER
    if (isOwner) {
      loadExpenses();
    }
    // Always load employees for dropdown
    loadEmployees();

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

  // LAZY LOAD STATE
  const [isHrDataLoaded, setIsHrDataLoaded] = useState(false);

  useEffect(() => {
    // 1. Check if user is opening the Satellite Tab
    if (activeTab === "hr_monitor" && isOwner) {
      // 2. STRICT LAZY LOADING: Only fetch if NOT loaded yet (or if period changes)
      // Note: We reset isHrDataLoaded when period changes to force refresh
      if (!isHrDataLoaded) {
        console.log("📡 Lazy Loading HR Data for period:", period);
        // Use primitives in dependency array to be 100% safe
        loadAttendancesByDateRange(dateRange.start, dateRange.end);
        setIsHrDataLoaded(true);
      }
    }
  }, [
    activeTab,
    period,
    isOwner,
    isHrDataLoaded, // Add dependency
    dateRange.start.getTime(), // Compare by timestamp (primitive)
    dateRange.end.getTime(), // Compare by timestamp (primitive)
    loadAttendancesByDateRange,
  ]);

  // Reset lazy load state when period changes (so we fetch new data)
  useEffect(() => {
    setIsHrDataLoaded(false);
  }, [period]);

  const [formData, setFormData] = useState({
    displayAmount: "",
    rawAmount: 0,
    category: "OPERATIONAL",
    description: "",
    employeeId: "",
    employeeName: "",
    createdBy: "Owner",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const activeEmployees = getActiveEmployees();

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
  const [operationalViewMode, setOperationalViewMode] = useState("DAILY"); // DAILY | WEEKLY
  const [isOperationalMatrixLoaded, setIsOperationalMatrixLoaded] =
    useState(false);

  // Reset matrix load state when period changes
  useEffect(() => {
    setIsOperationalMatrixLoaded(false);
  }, [period]);

  // Lazy Load Trigger for Operational Matrix
  useEffect(() => {
    if (
      activeTab === "operational" &&
      operationalViewMode === "WEEKLY" &&
      !isOperationalMatrixLoaded
    ) {
      console.log("📡 Lazy Processing Operational Matrix...");
      // Simulate "Fetch/Process" delay for UX (and separate thread work)
      const timer = setTimeout(() => {
        setIsOperationalMatrixLoaded(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [activeTab, operationalViewMode, isOperationalMatrixLoaded]);

  // 🧠 OPERATIONAL MATRIX LOGIC (SINGLE ROW EXECUTIVE SUMMARY)
  const operationalMatrix = useMemo(() => {
    if (operationalViewMode !== "WEEKLY" || !isOperationalMatrixLoaded)
      return [];

    // Initialize Single Row
    const summary = {
      name: "TOTAL OPERASIONAL",
      key: "TOTAL",
      weeks: { 1: 0, 2: 0, 3: 0, 4: 0 },
      total: 0,
    };

    operationalExpenses.forEach((exp) => {
      // Bucket Logic
      const d = new Date(exp.date);
      const day = d.getDate();
      let bucket = 4;
      if (day <= 7) bucket = 1;
      else if (day <= 14) bucket = 2;
      else if (day <= 21) bucket = 3;

      summary.weeks[bucket] += exp.amount;
      summary.total += exp.amount;
    });

    return [summary];
  }, [operationalExpenses, operationalViewMode, isOperationalMatrixLoaded]);

  // 🧠 HR AGGREGATOR LOGIC (WEEKLY MATRIX)
  const hrMatrix = useMemo(() => {
    if (activeTab !== "hr_monitor") return [];

    const matrix = {};

    // 1. Initialize buckets for all active employees
    activeEmployees.forEach((emp) => {
      matrix[emp.id] = {
        name: emp.name,
        weeks: {
          1: { hours: 0, money: 0 },
          2: { hours: 0, money: 0 },
          3: { hours: 0, money: 0 },
          4: { hours: 0, money: 0 },
        },
        total: { hours: 0, money: 0 },
      };
    });

    // 2. Add "Legacy/Unassigned" Bucket
    matrix["legacy"] = {
      name: "Data Lama / Unassigned",
      weeks: {
        1: { hours: 0, money: 0 },
        2: { hours: 0, money: 0 },
        3: { hours: 0, money: 0 },
        4: { hours: 0, money: 0 },
      },
      total: { hours: 0, money: 0 },
    };

    // Helper to get week bucket (1-4)
    const getBucket = (date) => {
      const d = new Date(date);
      // Simple logic: Day 1-7 = Week 1, etc.
      const day = d.getDate();
      if (day <= 7) return 1;
      if (day <= 14) return 2;
      if (day <= 21) return 3;
      return 4; // 22-End
    };

    // 3. Aggregate Attendance (Hours)
    attendances.forEach((att) => {
      if (!att.checkInTime || !att.checkOutTime) return;
      const bucket = getBucket(att.date);
      const hours = Number(att.totalHours || 0);

      if (matrix[att.employeeId]) {
        matrix[att.employeeId].weeks[bucket].hours += hours;
        matrix[att.employeeId].total.hours += hours;
      }
    });

    // 4. Aggregate Expenses (Money) - SALARY/BON Only
    payrollExpenses.forEach((exp) => {
      const bucket = getBucket(exp.date);
      const amount = Number(exp.amount || 0);
      const empId = exp.employeeId || "legacy"; // Default to legacy if NULL

      if (matrix[empId]) {
        matrix[empId].weeks[bucket].money += amount;
        matrix[empId].total.money += amount;
      } else {
        // Fallback for inactive employees ?? OR just put in legacy
        // For now, put in legacy to be safe
        matrix["legacy"].weeks[bucket].money += amount;
        matrix["legacy"].total.money += amount;
      }
    });

    return Object.values(matrix);
  }, [activeTab, attendances, payrollExpenses, activeEmployees]);

  const totalOperational = operationalExpenses.reduce(
    (sum, exp) => sum + exp.amount,
    0,
  );
  const totalPayroll = payrollExpenses.reduce(
    (sum, exp) => sum + exp.amount,
    0,
  );
  const grandTotal = totalOperational + totalPayroll;

  // Handlers
  const handleAmountChange = (e) => {
    const inputValue = e.target.value;
    const formatted = formatCurrencyInput(inputValue);
    const raw = parseCurrencyInput(formatted);
    setFormData({ ...formData, displayAmount: formatted, rawAmount: raw });
  };

  const handleRecipientChange = (e) => {
    const selectedId = e.target.value;
    const selectedEmp = activeEmployees.find((emp) => emp.id === selectedId);
    setFormData({
      ...formData,
      employeeId: selectedId,
      employeeName: selectedEmp ? selectedEmp.name : "",
    });
  };

  const handleDispenserChange = (e) => {
    setFormData({ ...formData, createdBy: e.target.value });
  };

  const handleCategoryChange = (e) => {
    setFormData({
      ...formData,
      category: e.target.value,
      employeeId: "",
      employeeName: "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (formData.rawAmount <= 0) {
      setFormError("Nominal harus diisi");
      return;
    }

    const isEmployeeTx =
      formData.category === "SALARY" || formData.category === "BON";

    if (isEmployeeTx && !formData.employeeId) {
      setFormError("❌ WAJIB pilih nama karyawan dari dropdown!");
      return;
    }

    setIsSubmitting(true);
    try {
      await addExpense({
        amount: formData.rawAmount,
        category: formData.category,
        description: formData.description,
        employeeId: isEmployeeTx ? formData.employeeId : null,
        employeeName: isEmployeeTx ? formData.employeeName : null,
        createdBy: formData.createdBy,
      });

      setFormData({
        displayAmount: "",
        rawAmount: 0,
        category: "OPERATIONAL",
        description: "",
        employeeId: "",
        employeeName: "",
        createdBy: "Owner",
      });
      setShowModal(false);
    } catch (error) {
      console.error("Failed to add expense:", error);
      setFormError(error.message || "Gagal menyimpan data");
    } finally {
      setIsSubmitting(false);
    }
  };

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
    setSelectedDetail({
      type: "HR",
      id: employeeId,
      name: employeeName,
      week: weekBucket,
      start: range.start,
      end: range.end,
    });
  };

  const handleOperationalCellClick = (weekBucket) => {
    const range = getWeekDateRange(weekBucket);
    setSelectedDetail({
      type: "OPERATIONAL_WEEKLY",
      id: "WEEKLY_SUMMARY",
      name: `Minggu ke-${weekBucket}`,
      week: weekBucket,
      start: range.start,
      end: range.end,
    });
  };

  // Filter Data for Drill Down
  const drillDownData = useMemo(() => {
    if (!selectedDetail)
      return { attendances: [], expenses: [], categorySummary: {} };

    const { type, id, start, end } = selectedDetail;

    if (type === "HR") {
      const atts = attendances.filter((a) => {
        const d = new Date(a.date);
        return (
          a.employeeId === id &&
          d >= start &&
          d <= end &&
          (a.checkInTime || a.checkOutTime)
        );
      });

      const exps = payrollExpenses.filter((e) => {
        const d = new Date(e.date);
        const isTarget = id === "legacy" ? !e.employeeId : e.employeeId === id;
        return isTarget && d >= start && d <= end;
      });

      return { attendances: atts, expenses: exps, categorySummary: {} };
    } else if (type === "OPERATIONAL_WEEKLY") {
      // EXECUTIVE SUMMARY DRILL DOWN (Rich Aggregator)
      const exps = operationalExpenses.filter((e) => {
        const d = new Date(e.date);
        return d >= start && d <= end;
      });

      // Calculate Category Aggregates ON THE FLY
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

      // Sort by Date Descending
      exps.sort((a, b) => new Date(b.date) - new Date(a.date));

      return { attendances: [], expenses: exps, categorySummary: categories };
    } else {
      // Fallback (Should not be reached with new logic)
      return { attendances: [], expenses: [], categorySummary: {} };
    }
  }, [
    selectedDetail,
    attendances,
    payrollExpenses,
    operationalExpenses,
    // getSmartAuditCategory is outside scope, stable
  ]);

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
              <>
                {/* View Mode Toggle */}
                <div className="p-4 bg-slate-900/50 border-b border-slate-700 flex justify-end">
                  <div className="bg-slate-800 p-1 rounded-lg flex gap-1">
                    <button
                      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${operationalViewMode === "DAILY" ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
                      onClick={() => setOperationalViewMode("DAILY")}
                    >
                      ⚡ HARIAN
                    </button>
                    <button
                      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${operationalViewMode === "WEEKLY" ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-white"}`}
                      onClick={() => setOperationalViewMode("WEEKLY")}
                    >
                      📅 REKAP MINGGUAN
                    </button>
                  </div>
                </div>

                {operationalViewMode === "WEEKLY" ? (
                  // MODE B: LAZY MATRIX VIEW
                  <div className="w-full overflow-x-auto min-h-[300px]">
                    {!isOperationalMatrixLoaded ? (
                      <div className="flex flex-col items-center justify-center py-20 text-slate-500 animate-pulse">
                        <div className="text-4xl mb-2">📡</div>
                        <p>Mengambil data rekap bulanan...</p>
                      </div>
                    ) : (
                      <table className="w-full text-left text-slate-300">
                        <thead className="bg-emerald-900/20 text-xs font-bold uppercase text-emerald-300 border-b border-emerald-500/30">
                          <tr>
                            <th className="p-4 min-w-[200px]">Nama Item</th>
                            <th className="p-4 text-center">Minggu 1</th>
                            <th className="p-4 text-center">Minggu 2</th>
                            <th className="p-4 text-center">Minggu 3</th>
                            <th className="p-4 text-center">Minggu 4+</th>
                            <th className="p-4 text-right bg-slate-900/50">
                              TOTAL
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                          {operationalMatrix.map((row) => (
                            <tr
                              key={row.key}
                              className="hover:bg-slate-700/50 transition-colors"
                            >
                              <td className="p-4 font-bold text-white text-lg">
                                {row.name}
                              </td>
                              {[1, 2, 3, 4].map((w) => (
                                <td
                                  key={w}
                                  className="p-2 text-center border-l border-slate-700/50 cursor-pointer hover:bg-emerald-500/10 transition-colors"
                                  onClick={() => handleOperationalCellClick(w)}
                                  title="Klik untuk Bedah Pengeluaran"
                                >
                                  {row.weeks[w] > 0 ? (
                                    <span className="text-sm text-emerald-400 font-mono font-bold">
                                      {formatRupiah(row.weeks[w])}
                                    </span>
                                  ) : (
                                    <span className="text-slate-600 text-sm">
                                      -
                                    </span>
                                  )}
                                </td>
                              ))}
                              <td className="p-4 text-right bg-slate-900/30 border-l border-slate-700 font-bold text-emerald-300 text-lg font-mono">
                                {formatRupiah(row.total)}
                              </td>
                            </tr>
                          ))}
                          {operationalMatrix.length === 0 && (
                            <tr>
                              <td
                                colSpan="6"
                                className="p-8 text-center text-slate-500"
                              >
                                Tidak ada data operasional
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                ) : // MODE A: DAILY LIST (Existing View)
                operationalExpenses.length === 0 ? (
                  <div className="p-12 text-center text-slate-500">
                    <div className="text-4xl mb-2">📭</div>
                    <p>Belum ada pengeluaran operasional.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-slate-300">
                    <thead className="bg-slate-900 text-xs font-bold uppercase text-slate-400">
                      <tr>
                        <th className="p-4">Tanggal</th>
                        <th className="p-4">Kategori</th>
                        <th className="p-4">Keterangan</th>
                        <th className="p-4">Nominal</th>
                        <th className="p-4">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {operationalExpenses.map((exp) => (
                        <tr key={exp.id} className="hover:bg-slate-700/50">
                          <td className="p-4 text-sm text-slate-400">
                            {new Date(exp.date).toLocaleDateString("id-ID", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
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
                          <td className="p-4 font-medium text-white">
                            {exp.description}
                            <div className="text-[10px] text-slate-500 mt-1">
                              By: {exp.created_by || "Owner"}
                            </div>
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
                )}
              </>
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

            {/* HR MONITOR SATELLITE VIEW */}
            {activeTab === "hr_monitor" && (
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-slate-300">
                  <thead className="bg-purple-900/20 text-xs font-bold uppercase text-purple-300 border-b border-purple-500/30">
                    <tr>
                      <th className="p-4 min-w-[150px]">Karyawan</th>
                      <th className="p-4 text-center">
                        Minggu 1<br />
                        <span className="text-[10px] opacity-60">Tgl 1-7</span>
                      </th>
                      <th className="p-4 text-center">
                        Minggu 2<br />
                        <span className="text-[10px] opacity-60">Tgl 8-14</span>
                      </th>
                      <th className="p-4 text-center">
                        Minggu 3<br />
                        <span className="text-[10px] opacity-60">
                          Tgl 15-21
                        </span>
                      </th>
                      <th className="p-4 text-center">
                        Minggu 4+
                        <br />
                        <span className="text-[10px] opacity-60">
                          Tgl 22-End
                        </span>
                      </th>
                      <th className="p-4 text-right bg-slate-900/50">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {hrMatrix.map((row) => (
                      <tr key={row.name} className="hover:bg-slate-700/50">
                        <td className="p-4 font-bold text-white">
                          {row.name}
                          {row.name === "Data Lama / Unassigned" && (
                            <span className="block text-[10px] text-slate-500 font-normal">
                              Belum ada link ID
                            </span>
                          )}
                        </td>
                        {[1, 2, 3, 4].map((w) => (
                          <td
                            key={w}
                            className="p-2 text-center border-l border-slate-700/50 cursor-pointer hover:bg-purple-500/10 transition-colors"
                            onClick={() =>
                              handleHrCellClick(
                                row.name === "Data Lama / Unassigned"
                                  ? "legacy"
                                  : activeEmployees.find(
                                      (e) => e.name === row.name,
                                    )?.id || "legacy",
                                row.name,
                                w,
                              )
                            }
                            title="Klik untuk detail"
                          >
                            <div className="flex flex-col gap-1 items-center">
                              {/* Hours Badge */}
                              {row.weeks[w].hours > 0 ? (
                                <span className="text-xs bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">
                                  {row.weeks[w].hours.toFixed(1)}j
                                </span>
                              ) : null}

                              {/* Money Text */}
                              {row.weeks[w].money > 0 ? (
                                <span className="text-xs text-red-400 font-mono font-bold">
                                  {formatRupiah(row.weeks[w].money)}
                                </span>
                              ) : null}

                              {/* Empty State */}
                              {row.weeks[w].hours === 0 &&
                                row.weeks[w].money === 0 && (
                                  <span className="text-slate-600 text-xs">
                                    -
                                  </span>
                                )}
                            </div>
                          </td>
                        ))}
                        <td className="p-4 text-right bg-slate-900/30 border-l border-slate-700">
                          <div className="font-bold text-white">
                            {row.total.hours.toFixed(1)} Jam
                          </div>
                          <div className="text-red-400 font-mono font-bold mt-1">
                            {formatRupiah(row.total.money)}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {hrMatrix.length === 0 && (
                      <tr>
                        <td
                          colSpan="6"
                          className="p-8 text-center text-slate-500"
                        >
                          Tidak ada data untuk periode ini
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
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
      {showModal && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-700 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">
                ➕ Catat Pengeluaran
              </h2>
              <button
                className="text-slate-400 hover:text-white"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-6 overflow-y-auto custom-scrollbar space-y-4"
            >
              {formError && (
                <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded-lg text-sm font-bold">
                  {formError}
                </div>
              )}

              {/* 1. NOMINAL */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">
                  Nominal
                </label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-3 text-emerald-500 font-bold">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formData.displayAmount}
                    onChange={handleAmountChange}
                    placeholder="0"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg py-3 pl-10 pr-4 text-white text-lg font-mono outline-none focus:border-emerald-500"
                    autoFocus
                  />
                </div>
              </div>

              {/* 2. KATEGORI */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">
                  Kategori
                </label>
                <select
                  value={formData.category}
                  onChange={handleCategoryChange}
                  className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-blue-500"
                >
                  {Object.values(EXPENSE_CATEGORIES).map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. PENERIMA DANA (KHUSUS GAJI/BON) */}
              {(formData.category === "SALARY" ||
                formData.category === "BON") && (
                <div className="bg-blue-900/20 p-4 rounded-xl border border-blue-500/30">
                  <label className="text-xs font-bold text-blue-300 uppercase block mb-2">
                    👤 Penerima Dana (Karyawan)
                  </label>
                  <select
                    value={formData.employeeId}
                    onChange={handleRecipientChange}
                    className="w-full bg-slate-900 border border-blue-500/50 rounded-lg p-3 text-white outline-none focus:border-blue-400"
                  >
                    <option value="">-- Pilih Karyawan --</option>
                    {activeEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-blue-400 mt-1">
                    * Wajib dipilih agar data akurat
                  </p>
                </div>
              )}

              {/* 4. KETERANGAN */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">
                  Keterangan
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Contoh: Token Listrik / Kasbon"
                  className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-blue-500"
                />
              </div>

              {/* 5. DISPENSER (DIKELUARKAN OLEH) */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">
                  💁‍♂️ Dikeluarkan Oleh (Kasir/CS)
                </label>
                <select
                  value={formData.createdBy}
                  onChange={handleDispenserChange}
                  className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-purple-500"
                >
                  <option value="Owner">👑 Owner</option>
                  {activeEmployees.map((emp) => (
                    <option key={emp.id} value={emp.name}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || formData.rawAmount <= 0}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg shadow-lg mt-4 disabled:opacity-50 active:scale-95 transition-transform"
              >
                {isSubmitting ? "⏳ Menyimpan..." : "💾 Simpan Pengeluaran"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 🧾 DETAIL DRILL-DOWN MODAL */}
      {selectedDetail && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] backdrop-blur-sm p-4 animate-fadeIn"
          onClick={() => setSelectedDetail(null)}
        >
          <div
            className="bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-700 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50 rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  📊 Detail: {selectedDetail.name}
                </h2>
                <div className="text-xs text-purple-400 font-mono mt-1">
                  Minggu ke-{selectedDetail.week} •{" "}
                  {selectedDetail.start.toLocaleDateString("id-ID")} -{" "}
                  {selectedDetail.end.toLocaleDateString("id-ID")}
                </div>
              </div>
              <button
                className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-2 rounded-full transition-all"
                onClick={() => setSelectedDetail(null)}
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
              {/* SECTION A: ATTENDANCE LOG (HR ONLY) */}
              {selectedDetail.type === "HR" && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-blue-500/20 rounded-lg text-blue-400">
                      🕒
                    </div>
                    <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                      Riwayat Absensi (Jam Kerja)
                    </h3>
                  </div>

                  {drillDownData.attendances.length === 0 ? (
                    <div className="text-center p-6 border border-dashed border-slate-700 rounded-xl text-slate-500 text-sm">
                      Tidak ada data absensi di minggu ini.
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-slate-700">
                      <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-slate-800 text-xs text-slate-400 uppercase font-bold">
                          <tr>
                            <th className="p-3">Tanggal</th>
                            <th className="p-3">Masuk</th>
                            <th className="p-3">Pulang</th>
                            <th className="p-3 text-right">Durasi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700 bg-slate-900/50">
                          {drillDownData.attendances.map((att) => (
                            <tr key={att.id}>
                              <td className="p-3 font-medium text-white">
                                {new Date(att.date).toLocaleDateString(
                                  "id-ID",
                                  {
                                    weekday: "short",
                                    day: "numeric",
                                    month: "short",
                                  },
                                )}
                              </td>
                              <td className="p-3 font-mono text-emerald-400">
                                {att.checkInTime
                                  ? new Date(
                                      att.checkInTime,
                                    ).toLocaleTimeString("id-ID", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "-"}
                              </td>
                              <td className="p-3 font-mono text-red-400">
                                {att.checkOutTime
                                  ? new Date(
                                      att.checkOutTime,
                                    ).toLocaleTimeString("id-ID", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "-"}
                              </td>
                              <td className="p-3 text-right font-bold text-blue-300">
                                {att.totalHours ? att.totalHours.toFixed(1) : 0}{" "}
                                Jam
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION B: MONEY LOG (HR & OPERATIONAL) */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className={`p-1.5 rounded-lg ${selectedDetail.type === "HR" ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400"}`}
                  >
                    {selectedDetail.type === "HR" ? "💸" : "🛡️"}
                  </div>
                  <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                    {selectedDetail.type === "HR"
                      ? "Riwayat Pengambilan Uang"
                      : selectedDetail.type === "OPERATIONAL_WEEKLY"
                        ? "Bedah Pengeluaran Mingguan"
                        : `Rekam Jejak: ${selectedDetail.name}`}
                  </h3>
                </div>

                {/* 📊 SECTION A: AGGREGATOR (OPERATIONAL WEEKLY ONLY) */}
                {selectedDetail.type === "OPERATIONAL_WEEKLY" &&
                  drillDownData.categorySummary && (
                    <div className="grid grid-cols-2 gap-3 mb-6 p-4 bg-slate-900/50 rounded-xl border border-slate-700">
                      {[
                        {
                          key: "KONSUMSI",
                          label: "🍛 KONSUMSI",
                          color: "text-orange-400",
                        },
                        {
                          key: "TRANSPORT",
                          label: "⛽ TRANSPORT",
                          color: "text-blue-400",
                        },
                        {
                          key: "UTILITAS",
                          label: "⚡ UTILITAS",
                          color: "text-yellow-400",
                        },
                        {
                          key: "ATK_BAHAN",
                          label: "📎 ATK & BAHAN",
                          color: "text-pink-400",
                        },
                        {
                          key: "LAIN_LAIN",
                          label: "📦 LAIN-LAIN",
                          color: "text-slate-400",
                        },
                      ].map((cat) => (
                        <div
                          key={cat.key}
                          className="flex justify-between items-center"
                        >
                          <span className="text-xs text-slate-400 font-bold">
                            {cat.label}
                          </span>
                          <span
                            className={`text-sm font-mono font-bold ${
                              drillDownData.categorySummary[cat.key] > 0
                                ? cat.color
                                : "text-slate-600"
                            }`}
                          >
                            {formatRupiah(
                              drillDownData.categorySummary[cat.key] || 0,
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                {/* 📝 SECTION B: TRANSACTION SNAPSHOT */}
                {drillDownData.expenses.length === 0 ? (
                  <div className="text-center p-6 border border-dashed border-slate-700 rounded-xl text-slate-500 text-sm">
                    {selectedDetail.type === "HR"
                      ? "Tidak ada pengambilan uang (Bon/Gaji) di minggu ini."
                      : "Tidak ada transaksi kategori ini di minggu ini."}
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-xl border border-slate-700">
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead className="bg-slate-800 text-xs text-slate-400 uppercase font-bold">
                        <tr>
                          <th className="p-3">Waktu</th>
                          <th className="p-3">Item / Keterangan</th>
                          <th className="p-3 text-right">Nominal</th>
                          {(selectedDetail.type === "OPERATIONAL" ||
                            selectedDetail.type === "OPERATIONAL_WEEKLY") && (
                            <th className="p-3 text-right">👮 Oleh</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700 bg-slate-900/50">
                        {drillDownData.expenses.map((exp) => (
                          <tr key={exp.id}>
                            <td className="p-3 text-xs text-slate-400">
                              <span className="opacity-50">
                                {new Date(exp.date).toLocaleDateString(
                                  "id-ID",
                                  {
                                    day: "numeric",
                                    month: "numeric",
                                  },
                                )}
                              </span>{" "}
                              <span className="font-mono text-white">
                                {new Date(exp.date).toLocaleTimeString(
                                  "id-ID",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="font-bold text-white">
                                {exp.description}
                              </div>
                              {selectedDetail.type === "HR" && (
                                <div className="text-[10px] text-slate-500 uppercase mt-0.5">
                                  {exp.category}
                                </div>
                              )}
                            </td>
                            <td
                              className={`p-3 text-right font-mono font-bold ${selectedDetail.type === "HR" ? "text-red-400" : "text-emerald-400"}`}
                            >
                              {formatRupiah(exp.amount)}
                            </td>
                            {(selectedDetail.type === "OPERATIONAL" ||
                              selectedDetail.type === "OPERATIONAL_WEEKLY") && (
                              <td className="p-3 text-right">
                                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded border border-slate-700 font-bold uppercase">
                                  {exp.created_by || "Owner"}
                                </span>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExpensePage;
