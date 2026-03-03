import React from "react";
import { formatRupiah } from "../../core/formatters";
import { EXPENSE_CATEGORIES } from "../../stores/useExpenseStore";

const OperationalTab = ({
  operationalViewMode,
  setOperationalViewMode,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  isOpMatrixLoading,
  opMatrixData,
  handleOperationalCellClick,
  operationalExpenses,
  handleDelete,
}) => {
  const getCategoryLabel = (catId) => EXPENSE_CATEGORIES[catId]?.label || catId;
  const getCategoryColor = (catId) =>
    EXPENSE_CATEGORIES[catId]?.color || "#64748b";

  return (
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
        // MODE B: SERVER-SIDE MATRIX VIEW
        <div className="w-full overflow-x-auto min-h-[300px]">
          <div className="flex items-center gap-4 mb-4 select-none px-4 pt-4">
            {/* Month/Year Selector */}
            <div className="flex gap-2 bg-slate-800 p-2 rounded-lg border border-slate-700">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-slate-900 text-white p-2 rounded border border-slate-700 focus:outline-none focus:border-emerald-500"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {new Date(0, m - 1).toLocaleString("id-ID", {
                      month: "long",
                    })}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-slate-900 text-white p-2 rounded border border-slate-700 focus:outline-none focus:border-emerald-500"
              >
                {[selectedYear - 1, selectedYear, selectedYear + 1].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {isOpMatrixLoading && (
              <div className="text-emerald-400 text-sm animate-pulse flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin"></div>
                Sinkronisasi Awan...
              </div>
            )}
          </div>

          <table className="w-full text-left text-slate-300">
            <thead className="bg-emerald-900/20 text-xs font-bold uppercase text-emerald-300 border-b border-emerald-500/30">
              <tr>
                <th className="p-4 min-w-[200px]">Kategori Item</th>
                <th className="p-4 text-center">Minggu 1</th>
                <th className="p-4 text-center">Minggu 2</th>
                <th className="p-4 text-center">Minggu 3</th>
                <th className="p-4 text-center">Minggu 4+</th>
                <th className="p-4 text-right bg-slate-900/50">TOTAL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {opMatrixData.length === 0 && !isOpMatrixLoading ? (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-slate-500">
                    <div className="text-4xl mb-2">📭</div>
                    <p>Tidak ada data operasional di bulan ini.</p>
                  </td>
                </tr>
              ) : (
                opMatrixData.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-700/50 transition-colors"
                  >
                    <td className="p-4 font-bold text-white text-lg">
                      {row.name}
                    </td>
                    {[1, 2, 3, 4].map((w) => {
                      const money = row.weeks?.[w] || 0;
                      return (
                        <td
                          key={w}
                          className="p-2 text-center border-l border-slate-700/50 cursor-pointer hover:bg-emerald-500/10 transition-colors"
                          onClick={() =>
                            handleOperationalCellClick(row.id, row.name, w)
                          }
                          title="Klik untuk Bedah Pengeluaran"
                        >
                          {money > 0 ? (
                            <span className="text-sm text-emerald-400 font-mono font-bold">
                              {formatRupiah(money)}
                            </span>
                          ) : (
                            <span className="text-slate-600 text-sm">-</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="p-4 text-right bg-slate-900/30 border-l border-slate-700 font-bold text-emerald-300 text-lg font-mono">
                      {formatRupiah(row.total || 0)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : operationalExpenses.length === 0 ? (
        // MODE A: DAILY LIST (Existing View)
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
  );
};

export default OperationalTab;
